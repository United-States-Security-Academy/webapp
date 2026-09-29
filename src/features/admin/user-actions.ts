'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { users, courses, type UserRole } from '@/db/schema';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireRole } from '@/features/auth/require-role';
import { getSupabaseAdminClient } from '@/supabase/admin-client';
import type { ActionResult } from '@/api-response/action-result';
import { getUserById } from './user-queries';

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
