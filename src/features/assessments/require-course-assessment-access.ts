import { ApiError } from '@/api-response/api-error';
import { API_ERROR_CODE } from '@/api-response/api-error-codes';
import type { AuthenticatedUser } from '@/features/auth/auth-types';
import { isUserEnrolledInCourse } from '@/features/enrollments/enrollment-queries';
import { getLearnerCourseProgress } from '@/features/progress/learner-course-progress';
import type { Course } from '@/features/courses/course-types';

export type AssessmentAccessStatus = 'ok' | 'not_enrolled' | 'course_incomplete';

export async function getAssessmentAccessStatus(
  authenticatedUser: AuthenticatedUser,
  courseRecord: Course,
): Promise<AssessmentAccessStatus> {
  if (authenticatedUser.role === 'admin' || courseRecord.ownerId === authenticatedUser.userId) return 'ok';

  const isEnrolled = await isUserEnrolledInCourse(authenticatedUser.userId, courseRecord.id);
  if (!isEnrolled) return 'not_enrolled';

  const progress = await getLearnerCourseProgress(authenticatedUser.userId, courseRecord);
  if (progress.completedAt === null) return 'course_incomplete';

  return 'ok';
}

export async function requireCourseAssessmentAccess(authenticatedUser: AuthenticatedUser, courseRecord: Course): Promise<void> {
  const status = await getAssessmentAccessStatus(authenticatedUser, courseRecord);
  if (status === 'not_enrolled') {
    throw new ApiError(403, API_ERROR_CODE.ASSESSMENT_NOT_AVAILABLE, 'Enroll in this course to take its assessment.');
  }
  if (status === 'course_incomplete') {
    throw new ApiError(
      403,
      API_ERROR_CODE.ASSESSMENT_COURSE_NOT_COMPLETE,
      'Complete every lesson in this course before taking the assessment.',
    );
  }
}
