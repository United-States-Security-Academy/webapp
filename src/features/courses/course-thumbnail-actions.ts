'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireCourseOwnership } from './require-course-ownership';
import {
  buildCourseThumbnailStoragePath,
  createCourseThumbnailUploadUrl,
  getCourseThumbnailPublicUrl,
} from './course-thumbnail-storage-client';

export async function createCourseThumbnailUploadTarget(
  courseId: string,
): Promise<ActionResult<{ signedUrl: string; token: string; path: string }>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    await requireCourseOwnership(authenticatedUser, courseId);

    const storagePath = buildCourseThumbnailStoragePath(courseId);
    const { signedUrl, token, path } = await createCourseThumbnailUploadUrl(storagePath);

    // Cache-bust: the storage path never changes on replace, so a stable URL would keep serving a cached old image.
    const thumbnailUrl = `${getCourseThumbnailPublicUrl(storagePath)}?v=${Date.now()}`;
    await db.update(courses).set({ thumbnailUrl }).where(eq(courses.id, courseId));

    return { success: true, data: { signedUrl, token, path } };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
