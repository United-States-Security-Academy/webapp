'use server';

import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { structuredLessonProgress } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { getCourseById } from '@/features/courses/course-queries';
import { isUserEnrolledInCourse } from '@/features/enrollments/enrollment-queries';
import { getPublishedStructuredLesson } from './structured-course-outline-queries';
import { checkQuizAnswers } from './structured-course-progress';
import { hasStructuredCourseAccess, isUuid } from './structured-lesson-access';

// Saves a structured lesson as complete. The browser calls this once the student has reached the
// end of the lesson with every inline quiz answered; everything is re-checked here: the lesson
// must be published, the student enrolled, and every quiz answered correctly.
export async function completeStructuredLesson(input: {
  moduleId: string;
  lessonKey: string;
  quizAnswers: unknown;
}): Promise<ActionResult<{ completedAt: Date }>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const moduleId = input?.moduleId;
    const lessonKey = input?.lessonKey;
    if (!isUuid(moduleId) || typeof lessonKey !== 'string') return { success: false, error: 'Lesson not found.' };

    const publishedLesson = await getPublishedStructuredLesson(moduleId, lessonKey);
    if (!publishedLesson) return { success: false, error: 'This lesson is no longer available. Reload the page.' };

    const courseRecord = await getCourseById(publishedLesson.courseId);
    if (!courseRecord || courseRecord.deliveryFormat !== 'structured') {
      return { success: false, error: 'This lesson is no longer available. Reload the page.' };
    }
    const isEnrolled = await isUserEnrolledInCourse(authenticatedUser.userId, courseRecord.id);
    if (!hasStructuredCourseAccess(authenticatedUser, courseRecord, isEnrolled)) {
      return { success: false, error: 'Enroll in this course to save your progress.' };
    }

    const quizCheck = checkQuizAnswers(publishedLesson.lesson.blocks, input.quizAnswers);
    if (!quizCheck.success) return { success: false, error: quizCheck.error };

    const now = new Date();
    const [progressRecord] = await db
      .insert(structuredLessonProgress)
      .values({
        userId: authenticatedUser.userId,
        moduleId,
        lessonKey,
        completedAt: now,
        revisionId: publishedLesson.revisionId,
        quizAnswers: quizCheck.answers,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [structuredLessonProgress.userId, structuredLessonProgress.moduleId, structuredLessonProgress.lessonKey],
        // The first completion time is kept (it's what certificates date from); the answers
        // are those of the latest run through the lesson.
        set: {
          completedAt: sql`coalesce(${structuredLessonProgress.completedAt}, ${now})`,
          revisionId: publishedLesson.revisionId,
          quizAnswers: quizCheck.answers,
          updatedAt: now,
        },
      })
      .returning({ completedAt: structuredLessonProgress.completedAt });

    return { success: true, data: { completedAt: progressRecord?.completedAt ?? now } };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
