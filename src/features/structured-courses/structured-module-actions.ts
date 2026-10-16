'use server';

import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses, structuredLessonProgress, structuredModuleRevisions, structuredModules, type CourseDeliveryFormat } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { API_ERROR_CODE } from '@/api-response/api-error-codes';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireCourseOwnership } from '@/features/courses/require-course-ownership';
import { getCourseById } from '@/features/courses/course-queries';
import { LEGACY_DOC_MESSAGE, parseStructuredModule } from './parse-structured-module';
import { structuredModuleContentSchema } from './structured-content-schema';
import {
  buildLessonImageStoragePath,
  buildModuleSourceStoragePath,
  createModuleSourceUploadUrl,
  downloadModuleSource,
  removeModuleRevisionFiles,
  uploadLessonImage,
} from './structured-course-storage-client';
import { getLatestStructuredRevision, getStructuredModuleById, getStructuredRevisionById, isStaleProcessing } from './structured-module-queries';

const MODULE_POSITION_GAP = 10;
// Matches the source bucket's file_size_limit (migration 0015).
const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const PROCESSING_FAILED_MESSAGE =
  'Something went wrong while processing this file. Please upload it again. If it keeps happening, contact support.';

async function getNextStructuredModulePosition(courseId: string): Promise<number> {
  const [lastModule] = await db
    .select({ position: structuredModules.position })
    .from(structuredModules)
    .where(eq(structuredModules.courseId, courseId))
    .orderBy(desc(structuredModules.position))
    .limit(1);
  return (lastModule?.position ?? 0) + MODULE_POSITION_GAP;
}

function checkSourceFile(fileName: string, fileSize: number): string | null {
  if (/\.doc$/i.test(fileName)) return LEGACY_DOC_MESSAGE;
  if (!/\.docx$/i.test(fileName)) return 'Upload a Word document (.docx).';
  if (fileSize <= 0) return 'This file is empty.';
  if (fileSize > MAX_SOURCE_FILE_BYTES) return 'This file is larger than 25 MB. Make the pictures in it smaller, or split the module into two files.';
  return null;
}

// Step 1 of an upload: records a 'processing' revision and returns a signed URL the browser
// uploads the .docx to directly (the file never passes through a Server Action, which has a
// small body limit). Without `moduleId` a new module is created at the end of the course; with
// it, the upload becomes a new draft of that module.
export async function createStructuredModuleUploadTarget(input: {
  courseId: string;
  moduleId?: string;
  fileName: string;
  fileSize: number;
}): Promise<ActionResult<{ revisionId: string; path: string; token: string }>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();

    const existingModule = input.moduleId ? await getStructuredModuleById(input.moduleId) : null;
    if (input.moduleId && !existingModule) throw new ApiError(404, API_ERROR_CODE.MODULE_NOT_FOUND, 'Module not found.');
    const courseId = existingModule?.courseId ?? input.courseId;
    await requireCourseOwnership(authenticatedUser, courseId);
    if (!existingModule && !(await getCourseById(courseId))) throw new ApiError(404, API_ERROR_CODE.COURSE_NOT_FOUND, 'Course not found.');

    const fileError = checkSourceFile(input.fileName, input.fileSize);
    if (fileError) return { success: false, error: fileError };

    if (existingModule) {
      const latestRevision = await getLatestStructuredRevision(existingModule.id);
      if (latestRevision && latestRevision.status === 'processing' && !isStaleProcessing(latestRevision.status, latestRevision.createdAt)) {
        return { success: false, error: 'The previous upload of this module is still processing. Wait for it to finish, then try again.' };
      }
    }

    const moduleId = existingModule?.id ?? randomUUID();
    const revisionId = randomUUID();
    const storagePath = buildModuleSourceStoragePath(moduleId, revisionId);
    // Created before any rows, so a storage failure leaves nothing half-made behind.
    const { path, token } = await createModuleSourceUploadUrl(storagePath);

    await db.transaction(async (transaction) => {
      if (!existingModule) {
        // Named after the file until it is processed; then the module's Heading 1 is used.
        const title = input.fileName.replace(/\.docx$/i, '').trim() || 'New module';
        const position = await getNextStructuredModulePosition(courseId);
        await transaction.insert(structuredModules).values({ id: moduleId, courseId, title, position });
      }
      await transaction.insert(structuredModuleRevisions).values({
        id: revisionId,
        moduleId,
        sourceFileName: input.fileName,
        sourceStoragePath: storagePath,
        status: 'processing',
        uploadedBy: authenticatedUser.userId,
      });
    });

    return { success: true, data: { revisionId, path, token } };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

async function markRevisionFailed(revisionId: string, errors: string[], warnings: string[] = []) {
  await db
    .update(structuredModuleRevisions)
    .set({ status: 'failed', parseErrors: errors, parseWarnings: warnings, processedAt: new Date() })
    .where(and(eq(structuredModuleRevisions.id, revisionId), eq(structuredModuleRevisions.status, 'processing')));
}

// Step 2, called once the browser has finished uploading: converts the stored .docx into draft
// lessons. The result is only ever a draft revision — publishedRevisionId is never touched here,
// so nothing changes for students.
export async function processStructuredModuleUpload(
  revisionId: string,
): Promise<ActionResult<{ status: 'ready' | 'failed'; errors: string[]; warnings: string[] }>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const revisionRecord = await getStructuredRevisionById(revisionId);
    if (!revisionRecord) return { success: false, error: 'Upload not found.' };
    const moduleRecord = await getStructuredModuleById(revisionRecord.moduleId);
    if (!moduleRecord) throw new ApiError(404, API_ERROR_CODE.MODULE_NOT_FOUND, 'Module not found.');
    await requireCourseOwnership(authenticatedUser, moduleRecord.courseId);

    // Already processed (e.g. a double click): report the stored outcome instead of redoing it.
    if (revisionRecord.status !== 'processing') {
      return {
        success: true,
        data: { status: revisionRecord.status, errors: revisionRecord.parseErrors, warnings: revisionRecord.parseWarnings },
      };
    }

    try {
      let sourceBytes: ArrayBuffer;
      try {
        sourceBytes = await downloadModuleSource(revisionRecord.sourceStoragePath);
      } catch {
        const errors = ["The file didn't finish uploading. Please upload it again."];
        await markRevisionFailed(revisionId, errors);
        return { success: true, data: { status: 'failed', errors, warnings: [] } };
      }

      const parsed = await parseStructuredModule(revisionRecord.sourceFileName, Buffer.from(sourceBytes), async (bytes, contentType, imageNumber) => {
        const extension = IMAGE_EXTENSIONS[contentType] ?? 'bin';
        const storagePath = buildLessonImageStoragePath(moduleRecord.id, revisionId, `image-${imageNumber}.${extension}`);
        await uploadLessonImage(storagePath, bytes, contentType);
        return storagePath;
      });

      if (parsed.errors.length > 0 || !parsed.module) {
        await markRevisionFailed(revisionId, parsed.errors, parsed.warnings);
        return { success: true, data: { status: 'failed', errors: parsed.errors, warnings: parsed.warnings } };
      }

      const moduleTitle = parsed.module.title;
      await db.transaction(async (transaction) => {
        await transaction
          .update(structuredModuleRevisions)
          .set({
            status: 'ready',
            content: { title: moduleTitle, lessons: parsed.lessons },
            parseErrors: [],
            parseWarnings: parsed.warnings,
            processedAt: new Date(),
          })
          .where(and(eq(structuredModuleRevisions.id, revisionId), eq(structuredModuleRevisions.status, 'processing')));
        // The module takes its title from the newest upload only, so a slow older upload can't
        // rename it after a newer one.
        const latestRevision = await getLatestStructuredRevision(moduleRecord.id);
        if (latestRevision?.id === revisionId) {
          await transaction.update(structuredModules).set({ title: moduleTitle }).where(eq(structuredModules.id, moduleRecord.id));
        }
      });
      return { success: true, data: { status: 'ready', errors: [], warnings: parsed.warnings } };
    } catch (error) {
      console.error('Structured module processing failed', { revisionId, error });
      await markRevisionFailed(revisionId, [PROCESSING_FAILED_MESSAGE]);
      return { success: true, data: { status: 'failed', errors: [PROCESSING_FAILED_MESSAGE], warnings: [] } };
    }
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

// Same behaviour as moveModule for PDF modules: a 1-based target position, with the new order
// worked out from the database so a stale tab can't scramble the course.
export async function moveStructuredModule(moduleId: string, targetPosition: number): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const moduleRecord = await getStructuredModuleById(moduleId);
    if (!moduleRecord) throw new ApiError(404, API_ERROR_CODE.MODULE_NOT_FOUND, 'Module not found.');
    await requireCourseOwnership(authenticatedUser, moduleRecord.courseId);

    const courseModules = await db
      .select({ id: structuredModules.id })
      .from(structuredModules)
      .where(eq(structuredModules.courseId, moduleRecord.courseId))
      .orderBy(asc(structuredModules.position), asc(structuredModules.createdAt));
    if (!Number.isInteger(targetPosition) || targetPosition < 1 || targetPosition > courseModules.length) {
      return { success: false, error: `Position must be between 1 and ${courseModules.length}.` };
    }

    const orderedIds = courseModules.map((courseModule) => courseModule.id).filter((id) => id !== moduleId);
    orderedIds.splice(targetPosition - 1, 0, moduleId);

    await db.transaction(async (transaction) => {
      for (const [index, id] of orderedIds.entries()) {
        await transaction
          .update(structuredModules)
          .set({ position: (index + 1) * MODULE_POSITION_GAP })
          .where(eq(structuredModules.id, id));
      }
    });
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

// Only unpublished modules with no student progress can be deleted, so this can't remove
// anything a student is reading or has made progress on.
export async function deleteStructuredModule(moduleId: string): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const moduleRecord = await getStructuredModuleById(moduleId);
    if (!moduleRecord) throw new ApiError(404, API_ERROR_CODE.MODULE_NOT_FOUND, 'Module not found.');
    await requireCourseOwnership(authenticatedUser, moduleRecord.courseId);
    if (moduleRecord.publishedRevisionId) {
      return { success: false, error: 'This module has been published, so it can’t be deleted. Upload a new version instead.' };
    }
    // A module published earlier and then unpublished may still hold students' progress.
    const [progressRecord] = await db
      .select({ id: structuredLessonProgress.id })
      .from(structuredLessonProgress)
      .where(eq(structuredLessonProgress.moduleId, moduleId))
      .limit(1);
    if (progressRecord) {
      return { success: false, error: 'Students have progress in this module, so it can’t be deleted. Upload a new version instead.' };
    }

    const revisionRecords = await db
      .select({ id: structuredModuleRevisions.id })
      .from(structuredModuleRevisions)
      .where(eq(structuredModuleRevisions.moduleId, moduleId));
    await db.delete(structuredModules).where(eq(structuredModules.id, moduleId));

    // The rows are gone either way; leftover files are only wasted storage, not visible to anyone.
    try {
      await removeModuleRevisionFiles(
        moduleId,
        revisionRecords.map((revisionRecord) => revisionRecord.id),
      );
    } catch (error) {
      console.error('Failed to remove structured module files', { moduleId, error });
    }
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Locks the course row for the rest of the transaction, so a format switch and an unpublish
// running at the same moment can't leave a structured course with an unpublished module.
async function lockCourse(transaction: Transaction, courseId: string) {
  const [courseRecord] = await transaction
    .select({ id: courses.id, deliveryFormat: courses.deliveryFormat })
    .from(courses)
    .where(eq(courses.id, courseId))
    .for('update');
  if (!courseRecord) throw new ApiError(404, API_ERROR_CODE.COURSE_NOT_FOUND, 'Course not found.');
  return courseRecord;
}

// Publishes exactly the revision the admin previewed (not whatever was uploaded since), by
// pointing the module at it. Earlier revisions are kept, so publishing never deletes anything.
export async function publishStructuredModule(moduleId: string, revisionId: string): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const moduleRecord = await getStructuredModuleById(moduleId);
    if (!moduleRecord) throw new ApiError(404, API_ERROR_CODE.MODULE_NOT_FOUND, 'Module not found.');
    await requireCourseOwnership(authenticatedUser, moduleRecord.courseId);

    const revisionRecord = await getStructuredRevisionById(revisionId);
    if (!revisionRecord || revisionRecord.moduleId !== moduleId || revisionRecord.status !== 'ready') {
      return { success: false, error: 'This version can’t be published. Reload the page and try again.' };
    }
    if (!structuredModuleContentSchema.safeParse(revisionRecord.content).success) {
      return { success: false, error: 'This version’s content is damaged. Upload the file again, then publish.' };
    }

    await db
      .update(structuredModules)
      .set({ publishedRevisionId: revisionId, publishedAt: new Date() })
      .where(eq(structuredModules.id, moduleId));
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function unpublishStructuredModule(moduleId: string): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const moduleRecord = await getStructuredModuleById(moduleId);
    if (!moduleRecord) throw new ApiError(404, API_ERROR_CODE.MODULE_NOT_FOUND, 'Module not found.');
    await requireCourseOwnership(authenticatedUser, moduleRecord.courseId);

    const error = await db.transaction(async (transaction) => {
      const courseRecord = await lockCourse(transaction, moduleRecord.courseId);
      // Students of a structured course are reading the published modules right now.
      if (courseRecord.deliveryFormat === 'structured') {
        return 'Students are taking this course as structured lessons, so its modules can’t be unpublished. Switch the course back to PDF lessons first, or upload and publish a corrected version instead.';
      }
      await transaction
        .update(structuredModules)
        .set({ publishedRevisionId: null, publishedAt: null })
        .where(eq(structuredModules.id, moduleId));
      return null;
    });
    if (error) return { success: false, error };
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

// Switches what students get for this course. Nothing is deleted either way: PDF lessons and
// PDF progress stay in place, so switching back to 'pdf' restores the course as it was.
export async function setCourseDeliveryFormat(courseId: string, deliveryFormat: CourseDeliveryFormat): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    await requireCourseOwnership(authenticatedUser, courseId);
    if (deliveryFormat !== 'pdf' && deliveryFormat !== 'structured') return { success: false, error: 'Unknown lesson format.' };

    const error = await db.transaction(async (transaction) => {
      await lockCourse(transaction, courseId);
      if (deliveryFormat === 'structured') {
        const moduleRecords = await transaction
          .select({ title: structuredModules.title, publishedRevisionId: structuredModules.publishedRevisionId })
          .from(structuredModules)
          .where(eq(structuredModules.courseId, courseId));
        if (moduleRecords.length === 0 || moduleRecords.every((moduleRecord) => !moduleRecord.publishedRevisionId)) {
          return 'Publish at least one structured module before switching this course to structured lessons.';
        }
        const unpublishedTitles = moduleRecords.filter((moduleRecord) => !moduleRecord.publishedRevisionId).map((moduleRecord) => `'${moduleRecord.title}'`);
        if (unpublishedTitles.length > 0) {
          return `Every structured module must be published first. Not published yet: ${unpublishedTitles.join(', ')}. Publish or delete ${unpublishedTitles.length === 1 ? 'it' : 'them'}, then switch.`;
        }
      }
      await transaction.update(courses).set({ deliveryFormat }).where(eq(courses.id, courseId));
      return null;
    });
    if (error) return { success: false, error };
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
