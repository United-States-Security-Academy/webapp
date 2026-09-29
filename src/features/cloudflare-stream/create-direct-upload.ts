'use server';

import { db } from '@/db/client';
import { lessons } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireCourseOwnership } from '@/features/courses/require-course-ownership';
import { getLessonById } from '@/features/lessons/lesson-queries';
import { getModuleById } from '@/features/modules/module-queries';
import { cloudflareStreamFetch } from './cloudflare-stream-client';

const MAX_LESSON_VIDEO_DURATION_SECONDS = 3600;

interface CloudflareStreamDirectUploadResponse {
  uploadURL: string;
  uid: string;
}

export async function createLessonDirectUpload(
  lessonId: string,
): Promise<ActionResult<{ cloudflareStreamUploadUrl: string; cloudflareStreamVideoId: string }>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();

    const lessonRecord = await getLessonById(lessonId);
    if (!lessonRecord) return { success: false, error: 'Lesson not found.' };

    const moduleRecord = await getModuleById(lessonRecord.moduleId);
    if (!moduleRecord) return { success: false, error: 'Module not found.' };

    await requireCourseOwnership(authenticatedUser, moduleRecord.courseId);

    const directUpload = await cloudflareStreamFetch<CloudflareStreamDirectUploadResponse>('/direct_upload', {
      method: 'POST',
      body: JSON.stringify({
        maxDurationSeconds: MAX_LESSON_VIDEO_DURATION_SECONDS,
        requireSignedURLs: true,
      }),
    });

    await db
      .update(lessons)
      .set({ cloudflareStreamVideoId: directUpload.uid })
      .where(eq(lessons.id, lessonId));

    return {
      success: true,
      data: { cloudflareStreamUploadUrl: directUpload.uploadURL, cloudflareStreamVideoId: directUpload.uid },
    };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
