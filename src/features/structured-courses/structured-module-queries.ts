import { and, asc, countDistinct, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { enrollments, lessonProgress, lessons, modules, structuredModuleRevisions, structuredModules, type StructuredRevisionStatus } from '@/db/schema';
import type { StructuredModuleContent } from '@/db/schema/structured-courses';
import { structuredModuleContentSchema } from './structured-content-schema';

// A file still "processing" after this long was interrupted (the server restarted or the browser
// closed mid-upload), so it is shown as failed and the admin can upload again.
export const STALE_PROCESSING_MS = 10 * 60 * 1000;
export const INTERRUPTED_UPLOAD_MESSAGE = 'Uploading or processing this file was interrupted. Please upload it again.';

export function isStaleProcessing(status: StructuredRevisionStatus, createdAt: Date, now = Date.now()): boolean {
  return status === 'processing' && now - createdAt.getTime() > STALE_PROCESSING_MS;
}

export async function getStructuredModuleById(moduleId: string) {
  const [moduleRecord] = await db.select().from(structuredModules).where(eq(structuredModules.id, moduleId));
  return moduleRecord ?? null;
}

export async function getStructuredRevisionById(revisionId: string) {
  const [revisionRecord] = await db.select().from(structuredModuleRevisions).where(eq(structuredModuleRevisions.id, revisionId));
  return revisionRecord ?? null;
}

export async function getLatestStructuredRevision(moduleId: string) {
  const [revisionRecord] = await db
    .select({ id: structuredModuleRevisions.id, status: structuredModuleRevisions.status, createdAt: structuredModuleRevisions.createdAt })
    .from(structuredModuleRevisions)
    .where(eq(structuredModuleRevisions.moduleId, moduleId))
    .orderBy(desc(structuredModuleRevisions.createdAt))
    .limit(1);
  return revisionRecord ?? null;
}

export interface StructuredModuleUpload {
  revisionId: string;
  fileName: string;
  status: StructuredRevisionStatus;
  errors: string[];
  warnings: string[];
  uploadedAt: Date;
}

export interface StructuredModuleDraftLesson {
  key: string;
  title: string;
  blockCount: number;
  quizQuestionCount: number;
}

export interface StructuredModuleSummary {
  id: string;
  title: string;
  isPublished: boolean;
  publishedRevisionId: string | null;
  // The most recent upload, whatever its outcome — what the status badge shows.
  latestUpload: StructuredModuleUpload | null;
  // The most recent upload that converted successfully. A failed re-upload leaves it in place.
  draft: (StructuredModuleUpload & { lessons: StructuredModuleDraftLesson[] }) | null;
}

// Every structured module of a course in order, with its upload status and draft lessons, for the
// instructor course page.
export async function listStructuredModulesForCourse(courseId: string): Promise<StructuredModuleSummary[]> {
  const moduleRecords = await db
    .select()
    .from(structuredModules)
    .where(eq(structuredModules.courseId, courseId))
    .orderBy(asc(structuredModules.position), asc(structuredModules.createdAt));
  if (moduleRecords.length === 0) return [];

  // Revision details without their (possibly large) content, newest first.
  const revisionRecords = await db
    .select({
      id: structuredModuleRevisions.id,
      moduleId: structuredModuleRevisions.moduleId,
      sourceFileName: structuredModuleRevisions.sourceFileName,
      status: structuredModuleRevisions.status,
      parseErrors: structuredModuleRevisions.parseErrors,
      parseWarnings: structuredModuleRevisions.parseWarnings,
      createdAt: structuredModuleRevisions.createdAt,
    })
    .from(structuredModuleRevisions)
    .where(
      inArray(
        structuredModuleRevisions.moduleId,
        moduleRecords.map((moduleRecord) => moduleRecord.id),
      ),
    )
    .orderBy(desc(structuredModuleRevisions.createdAt));

  const toUpload = (revisionRecord: (typeof revisionRecords)[number]): StructuredModuleUpload => {
    const isStale = isStaleProcessing(revisionRecord.status, revisionRecord.createdAt);
    return {
      revisionId: revisionRecord.id,
      fileName: revisionRecord.sourceFileName,
      status: isStale ? 'failed' : revisionRecord.status,
      errors: isStale ? [INTERRUPTED_UPLOAD_MESSAGE] : revisionRecord.parseErrors,
      warnings: revisionRecord.parseWarnings,
      uploadedAt: revisionRecord.createdAt,
    };
  };

  const latestByModule = new Map<string, StructuredModuleUpload>();
  const draftByModule = new Map<string, StructuredModuleUpload>();
  for (const revisionRecord of revisionRecords) {
    if (!latestByModule.has(revisionRecord.moduleId)) latestByModule.set(revisionRecord.moduleId, toUpload(revisionRecord));
    if (revisionRecord.status === 'ready' && !draftByModule.has(revisionRecord.moduleId)) {
      draftByModule.set(revisionRecord.moduleId, toUpload(revisionRecord));
    }
  }

  const draftRevisionIds = [...draftByModule.values()].map((upload) => upload.revisionId);
  const draftContents =
    draftRevisionIds.length === 0
      ? []
      : await db
          .select({ id: structuredModuleRevisions.id, content: structuredModuleRevisions.content })
          .from(structuredModuleRevisions)
          .where(and(inArray(structuredModuleRevisions.id, draftRevisionIds), eq(structuredModuleRevisions.status, 'ready')));
  const lessonsByRevision = new Map<string, StructuredModuleDraftLesson[]>();
  for (const { id, content } of draftContents) {
    const parsedContent = structuredModuleContentSchema.safeParse(content);
    if (!parsedContent.success) continue;
    lessonsByRevision.set(
      id,
      parsedContent.data.lessons.map((lesson) => ({
        key: lesson.key,
        title: lesson.title,
        blockCount: lesson.blocks.length,
        quizQuestionCount: lesson.blocks.reduce((count, block) => count + (block.type === 'quiz' ? block.questions.length : 0), 0),
      })),
    );
  }

  return moduleRecords.map((moduleRecord) => {
    const draftUpload = draftByModule.get(moduleRecord.id);
    const draftLessons = draftUpload ? lessonsByRevision.get(draftUpload.revisionId) : undefined;
    return {
      id: moduleRecord.id,
      title: moduleRecord.title,
      isPublished: moduleRecord.publishedRevisionId !== null,
      publishedRevisionId: moduleRecord.publishedRevisionId,
      latestUpload: latestByModule.get(moduleRecord.id) ?? null,
      draft: draftUpload && draftLessons ? { ...draftUpload, lessons: draftLessons } : null,
    };
  });
}

// Reads stored content back through the same zod schema it was saved with, so a page never
// renders a block shape it doesn't know. null when the stored content doesn't match.
function readRevisionContent(content: unknown): StructuredModuleContent | null {
  const parsedContent = structuredModuleContentSchema.safeParse(content);
  return parsedContent.success ? parsedContent.data : null;
}

export interface StructuredModulePreview {
  moduleId: string;
  courseId: string;
  title: string;
  publishedRevisionId: string | null;
  publishedAt: Date | null;
  // The newest upload that converted successfully: what the preview shows and what Publish publishes.
  draft: { revisionId: string; fileName: string; uploadedAt: Date; content: StructuredModuleContent; parseWarnings: string[] } | null;
  // Set when the newest upload is still processing or failed, so the page can say the preview
  // isn't of the newest file.
  newerUpload: StructuredModuleUpload | null;
}

export async function getStructuredModulePreview(moduleId: string): Promise<StructuredModulePreview | null> {
  const moduleRecord = await getStructuredModuleById(moduleId);
  if (!moduleRecord) return null;

  const [latestRevision] = await db
    .select({
      id: structuredModuleRevisions.id,
      sourceFileName: structuredModuleRevisions.sourceFileName,
      status: structuredModuleRevisions.status,
      parseErrors: structuredModuleRevisions.parseErrors,
      parseWarnings: structuredModuleRevisions.parseWarnings,
      createdAt: structuredModuleRevisions.createdAt,
    })
    .from(structuredModuleRevisions)
    .where(eq(structuredModuleRevisions.moduleId, moduleId))
    .orderBy(desc(structuredModuleRevisions.createdAt))
    .limit(1);

  const [draftRevision] = await db
    .select()
    .from(structuredModuleRevisions)
    .where(and(eq(structuredModuleRevisions.moduleId, moduleId), eq(structuredModuleRevisions.status, 'ready')))
    .orderBy(desc(structuredModuleRevisions.createdAt))
    .limit(1);
  const draftContent = draftRevision ? readRevisionContent(draftRevision.content) : null;

  let newerUpload: StructuredModuleUpload | null = null;
  if (latestRevision && latestRevision.id !== draftRevision?.id) {
    const isStale = isStaleProcessing(latestRevision.status, latestRevision.createdAt);
    newerUpload = {
      revisionId: latestRevision.id,
      fileName: latestRevision.sourceFileName,
      status: isStale ? 'failed' : latestRevision.status,
      errors: isStale ? [INTERRUPTED_UPLOAD_MESSAGE] : latestRevision.parseErrors,
      warnings: latestRevision.parseWarnings,
      uploadedAt: latestRevision.createdAt,
    };
  }

  return {
    moduleId: moduleRecord.id,
    courseId: moduleRecord.courseId,
    title: moduleRecord.title,
    publishedRevisionId: moduleRecord.publishedRevisionId,
    publishedAt: moduleRecord.publishedAt,
    draft:
      draftRevision && draftContent
        ? {
            revisionId: draftRevision.id,
            fileName: draftRevision.sourceFileName,
            uploadedAt: draftRevision.createdAt,
            content: draftContent,
            parseWarnings: draftRevision.parseWarnings,
          }
        : null,
    newerUpload,
  };
}

export function collectImageStoragePaths(content: StructuredModuleContent): string[] {
  return content.lessons.flatMap((lesson) => lesson.blocks.flatMap((block) => (block.type === 'image' ? [block.storagePath] : [])));
}

// Modules that would stop a course switching to structured delivery: every structured module
// must have a published version, and there must be at least one.
export async function listUnpublishedStructuredModules(courseId: string) {
  const moduleRecords = await db
    .select({ id: structuredModules.id, title: structuredModules.title, publishedRevisionId: structuredModules.publishedRevisionId })
    .from(structuredModules)
    .where(eq(structuredModules.courseId, courseId))
    .orderBy(asc(structuredModules.position), asc(structuredModules.createdAt));
  return {
    moduleCount: moduleRecords.length,
    unpublishedTitles: moduleRecords.filter((moduleRecord) => !moduleRecord.publishedRevisionId).map((moduleRecord) => moduleRecord.title),
  };
}

// Enrolled students who have started the course's PDF lessons, shown in the switch-format dialog.
export async function countEnrolledStudentsWithPdfProgress(courseId: string): Promise<number> {
  const [row] = await db
    .select({ studentCount: countDistinct(lessonProgress.userId) })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .innerJoin(enrollments, and(eq(enrollments.userId, lessonProgress.userId), eq(enrollments.courseId, modules.courseId)))
    .where(eq(modules.courseId, courseId));
  return Number(row?.studentCount ?? 0);
}
