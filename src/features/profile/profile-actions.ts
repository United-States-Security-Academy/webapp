'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { studentProfiles, type NewStudentProfile } from '@/db/schema';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import {
  buildProfilePhotoStoragePath,
  createProfilePhotoUploadUrl,
  getProfilePhotoPublicUrl,
} from './profile-photo-storage-client';

type UpsertStudentProfileInput = Omit<NewStudentProfile, 'userId' | 'updatedAt' | 'photoUrl'>;

export async function upsertStudentProfile(input: UpsertStudentProfileInput) {
  const authenticatedUser = await requireAuthenticatedUserFromSession();

  const [profile] = await db
    .insert(studentProfiles)
    .values({ userId: authenticatedUser.userId, ...input, updatedAt: new Date() })
    .onConflictDoUpdate({ target: studentProfiles.userId, set: { ...input, updatedAt: new Date() } })
    .returning();

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  return profile;
}

export async function createProfilePhotoUploadTarget() {
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
  return { signedUrl, token, path };
}
