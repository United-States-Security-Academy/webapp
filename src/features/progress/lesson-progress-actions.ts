'use server';

import { db } from '@/db/client';
import { lessonProgress } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireLessonAccess } from '@/features/lessons/require-lesson-access';
import { getLessonById } from '@/features/lessons/lesson-queries';
import { getModuleById } from '@/features/modules/module-queries';

export async function markLessonDone(lessonId: string): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();

    const lessonRecord = await getLessonById(lessonId);
    if (!lessonRecord) return { success: false, error: 'Lesson not found.' };

    const moduleRecord = await getModuleById(lessonRecord.moduleId);
    if (!moduleRecord) return { success: false, error: 'Module not found.' };

    await requireLessonAccess(authenticatedUser, lessonRecord, moduleRecord.courseId);

    await db
      .insert(lessonProgress)
      .values({ userId: authenticatedUser.userId, lessonId, completedAt: new Date() })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: { completedAt: new Date() },
      });
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
