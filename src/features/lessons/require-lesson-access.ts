import { ApiError } from '@/api-response/api-error';
import { API_ERROR_CODE } from '@/api-response/api-error-codes';
import type { AuthenticatedUser } from '@/features/auth/auth-types';
import { isUserEnrolledInCourse } from '@/features/enrollments/enrollment-queries';
import { getCourseById } from '@/features/courses/course-queries';
import type { Lesson } from '@/db/schema/lessons';

// The access rule on its own, for callers that have already loaded the course and enrollment.
export function hasLessonAccess(
  authenticatedUser: AuthenticatedUser,
  lesson: Pick<Lesson, 'isPreview'>,
  courseOwnerId: string,
  isEnrolled: boolean,
): boolean {
  return lesson.isPreview || authenticatedUser.role === 'admin' || courseOwnerId === authenticatedUser.userId || isEnrolled;
}

export async function requireLessonAccess(authenticatedUser: AuthenticatedUser, lesson: Lesson, courseId: string): Promise<void> {
  if (lesson.isPreview) return;
  if (authenticatedUser.role === 'admin') return;

  const courseRecord = await getCourseById(courseId);
  if (!courseRecord) throw new ApiError(404, API_ERROR_CODE.COURSE_NOT_FOUND, 'Course not found.');
  if (courseRecord.ownerId === authenticatedUser.userId) return;

  const isEnrolled = await isUserEnrolledInCourse(authenticatedUser.userId, courseId);
  if (!isEnrolled) {
    throw new ApiError(403, API_ERROR_CODE.LESSON_NOT_ENROLLED, 'Enroll in this course to access this lesson.');
  }
}
