'use server';

import { db } from '@/db/client';
import { enrollments } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';

export async function enrollInFreeCourse(courseSlug: string): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();

    const courseRecord = await getCourseBySlug(courseSlug);
    if (!courseRecord) return { success: false, error: 'Course not found.' };
    if (courseRecord.status !== 'published') {
      return { success: false, error: 'This course is not published yet.' };
    }
    if (courseRecord.priceAmountMinor > 0) {
      return { success: false, error: 'This course requires checkout.' };
    }

    await db
      .insert(enrollments)
      .values({ userId: authenticatedUser.userId, courseId: courseRecord.id })
      .onConflictDoNothing();
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
