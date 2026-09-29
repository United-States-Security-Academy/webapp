'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { lessons } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireCourseOwnership } from '@/features/courses/require-course-ownership';
import { getLessonById } from '@/features/lessons/lesson-queries';
import { getModuleById } from '@/features/modules/module-queries';
import { buildLessonPdfStoragePath, createLessonPdfUploadUrl } from './lesson-pdf-storage-client';

export async function createLessonPdfUploadTarget(
  lessonId: string,
): Promise<ActionResult<{ signedUrl: string; token: string; path: string }>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();

    const lessonRecord = await getLessonById(lessonId);
    if (!lessonRecord) return { success: false, error: 'Lesson not found.' };

    const moduleRecord = await getModuleById(lessonRecord.moduleId);
    if (!moduleRecord) return { success: false, error: 'Module not found.' };

    await requireCourseOwnership(authenticatedUser, moduleRecord.courseId);

    const storagePath = buildLessonPdfStoragePath(lessonId);
    const { signedUrl, token, path } = await createLessonPdfUploadUrl(storagePath);

    await db.update(lessons).set({ pdfStoragePath: storagePath }).where(eq(lessons.id, lessonId));

    return { success: true, data: { signedUrl, token, path } };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
