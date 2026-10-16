import type { AuthenticatedUser } from '@/features/auth/auth-types';
import type { Course } from '@/features/courses/course-types';

// Who can open a structured course's published lessons: enrolled students, plus the course owner
// and admins (who can check the live course). There are no free preview lessons in this format.
export function hasStructuredCourseAccess(
  authenticatedUser: AuthenticatedUser,
  courseRecord: Pick<Course, 'ownerId'>,
  isEnrolled: boolean,
): boolean {
  return isEnrolled || authenticatedUser.role === 'admin' || courseRecord.ownerId === authenticatedUser.userId;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ids come from the URL or the browser; the database rejects a malformed uuid with an error
// instead of finding nothing, so they are checked first.
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
