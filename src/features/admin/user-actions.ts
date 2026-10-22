'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { users, courses, enrollments, payments, type UserRole } from '@/db/schema';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireRole } from '@/features/auth/require-role';
import { getSupabaseAdminClient } from '@/supabase/admin-client';
import type { ActionResult } from '@/api-response/action-result';
import { getUserById } from './user-queries';
import { getGovernmentIdValue } from './user-detail-queries';
import { getAssessmentByCourseId } from '@/features/assessments/assessment-queries';
import { resetAttempts } from '@/features/assessments/attempt-limits';
import { getCourseById } from '@/features/courses/course-queries';
import { getEnrollmentStatus } from '@/features/enrollments/enrollment-queries';

export async function updateUserRole(userId: string, newRole: UserRole): Promise<ActionResult> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  requireRole(authenticatedUser, ['admin']);

  if (userId === authenticatedUser.userId) {
    return { success: false, error: 'You cannot change your own role.' };
  }

  const targetUser = await getUserById(userId);
  if (!targetUser) {
    return { success: false, error: 'User not found.' };
  }

  await db.update(users).set({ role: newRole }).where(eq(users.id, userId));
  revalidatePath('/admin/users');
  return { success: true, data: undefined };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  requireRole(authenticatedUser, ['admin']);

  if (userId === authenticatedUser.userId) {
    return { success: false, error: 'You cannot delete your own account.' };
  }

  const targetUser = await getUserById(userId);
  if (!targetUser) {
    return { success: false, error: 'User not found.' };
  }

  const [ownedCourse] = await db.select({ id: courses.id }).from(courses).where(eq(courses.ownerId, userId)).limit(1);
  if (ownedCourse) {
    return { success: false, error: 'This user owns courses. Reassign or delete their courses before deleting their account.' };
  }

  // Auth account first — if this fails we stop before touching our own data. If our row-delete
  // below fails after this succeeds, the person simply can't sign in again to be re-provisioned.
  const { error: deleteAuthUserError } = await getSupabaseAdminClient().auth.admin.deleteUser(userId);
  if (deleteAuthUserError) {
    return { success: false, error: `Failed to delete auth account: ${deleteAuthUserError.message}` };
  }

  await db.delete(users).where(eq(users.id, userId));
  revalidatePath('/admin/users');
  return { success: true, data: undefined };
}

// The full government ID is only sent to the browser when an admin clicks "Show" on a user's
// profile — the page itself only ever contains the masked value.
export async function revealGovernmentId(userId: string): Promise<ActionResult<string | null>> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  requireRole(authenticatedUser, ['admin']);
  return { success: true, data: await getGovernmentIdValue(userId) };
}

// Gives a learner a fresh set of exam attempts for one course (after they used them all). Their
// earlier attempts stay on record.
export async function resetExamAttempts(userId: string, courseId: string): Promise<ActionResult> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  requireRole(authenticatedUser, ['admin']);

  const [targetUser, assessment] = await Promise.all([getUserById(userId), getAssessmentByCourseId(courseId)]);
  if (!targetUser) return { success: false, error: 'User not found.' };
  if (!assessment) return { success: false, error: 'This course has no assessment.' };

  await resetAttempts(assessment.id, userId, authenticatedUser.userId);
  revalidatePath(`/admin/users/${userId}`);
  return { success: true, data: undefined };
}

// Enrolls a learner in a course without checkout (e.g. paid offline, a scholarship, staff). It is
// an ordinary enrollment, so the learner gets the same access as someone who paid; granted_by
// records which admin gave it.
export async function grantCourseAccess(userId: string, courseId: string): Promise<ActionResult> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  requireRole(authenticatedUser, ['admin']);

  const [targetUser, courseRecord] = await Promise.all([getUserById(userId), getCourseById(courseId)]);
  if (!targetUser) return { success: false, error: 'User not found.' };
  if (!courseRecord) return { success: false, error: 'Course not found.' };
  if (courseRecord.status !== 'published') {
    return { success: false, error: 'This course is not published yet. Publish it before giving anyone access.' };
  }

  const inserted = await db
    .insert(enrollments)
    .values({ userId, courseId, grantedBy: authenticatedUser.userId })
    .onConflictDoNothing()
    .returning({ id: enrollments.id });
  if (inserted.length === 0) return { success: false, error: 'This user already has access to this course.' };

  revalidatePath(`/admin/users/${userId}`);
  return { success: true, data: undefined };
}

// Takes back access an admin gave. Enrollments the learner paid for or took themselves can't be
// removed here. Their lesson progress and exam attempts are kept, so granting access again later
// picks up where they left off.
export async function revokeCourseAccess(userId: string, courseId: string): Promise<ActionResult> {
  const authenticatedUser = await requireAuthenticatedUserFromSession();
  requireRole(authenticatedUser, ['admin']);

  const enrollmentRecord = await getEnrollmentStatus(userId, courseId);
  if (!enrollmentRecord) return { success: false, error: 'This user is not enrolled in this course.' };
  if (!enrollmentRecord.grantedBy) {
    return { success: false, error: 'This user enrolled themselves, so their access can’t be removed here.' };
  }

  const [succeededPayment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.courseId, courseId), eq(payments.status, 'succeeded')))
    .limit(1);
  if (succeededPayment) {
    return { success: false, error: 'This user has paid for this course, so their access can’t be removed here.' };
  }

  await db.delete(enrollments).where(eq(enrollments.id, enrollmentRecord.id));
  revalidatePath(`/admin/users/${userId}`);
  return { success: true, data: undefined };
}
