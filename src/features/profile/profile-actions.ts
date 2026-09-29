'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { studentProfiles, type NewStudentProfile, type StudentProfile } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import {
  buildProfilePhotoStoragePath,
  createProfilePhotoUploadUrl,
  getProfilePhotoPublicUrl,
} from './profile-photo-storage-client';

type UpsertStudentProfileInput = Omit<NewStudentProfile, 'userId' | 'updatedAt' | 'photoUrl'>;

export async function upsertStudentProfile(input: UpsertStudentProfileInput): Promise<ActionResult<StudentProfile>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();

    const [profile] = await db
      .insert(studentProfiles)
      .values({ userId: authenticatedUser.userId, ...input, updatedAt: new Date() })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { ...input, updatedAt: new Date() } })
      .returning();
    if (!profile) return { success: false, error: 'Failed to save profile.' };

    revalidatePath('/dashboard/profile');
    revalidatePath('/dashboard');
    return { success: true, data: profile };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function createProfilePhotoUploadTarget(): Promise<ActionResult<{ signedUrl: string; token: string; path: string }>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();

    const storagePath = buildProfilePhotoStoragePath(authenticatedUser.userId);
    const { signedUrl, token, path } = await createProfilePhotoUploadUrl(storagePath);

    // Cache-bust: the storage path never changes on replace, so a stable URL would keep serving a cached old photo.
    const photoUrl = `${getProfilePhotoPublicUrl(storagePath)}?v=${Date.now()}`;
    await db
      .insert(studentProfiles)
      .values({ userId: authenticatedUser.userId, photoUrl, updatedAt: new Date() })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { photoUrl, updatedAt: new Date() } });

    revalidatePath('/dashboard/profile');
    return { success: true, data: { signedUrl, token, path } };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
