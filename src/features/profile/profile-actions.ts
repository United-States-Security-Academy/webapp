'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { studentProfiles, type NewStudentProfile, type StudentProfile } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { pickFields } from '@/pick-fields';
import {
  buildProfilePhotoStoragePath,
  createProfilePhotoUploadUrl,
  getProfilePhotoPublicUrl,
} from './profile-photo-storage-client';

const MAX_LICENSE_NUMBER_LENGTH = 50;

type UpsertStudentProfileInput = Omit<NewStudentProfile, 'userId' | 'updatedAt' | 'photoUrl'>;

const PROFILE_FIELDS = [
  'legalName',
  'governmentIdType',
  'governmentIdValue',
  'phoneNumber',
  'country',
  'state',
  'city',
  'residentialAddress',
  'licenseNumber',
] as const satisfies readonly (keyof UpsertStudentProfileInput)[];

export async function upsertStudentProfile(input: UpsertStudentProfileInput): Promise<ActionResult<StudentProfile>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    // Only the form's fields: a userId or photoUrl sent by the caller must never reach the query.
    const profileFields = pickFields(input, PROFILE_FIELDS);
    // The license number is optional: a cleared field is stored as "no license", not an empty string.
    if (profileFields.licenseNumber !== undefined) {
      profileFields.licenseNumber = typeof profileFields.licenseNumber === 'string' ? profileFields.licenseNumber.trim() || null : null;
      if (profileFields.licenseNumber && profileFields.licenseNumber.length > MAX_LICENSE_NUMBER_LENGTH) {
        return { success: false, error: `License number must be at most ${MAX_LICENSE_NUMBER_LENGTH} characters.` };
      }
    }

    const [profile] = await db
      .insert(studentProfiles)
      .values({ ...profileFields, userId: authenticatedUser.userId, updatedAt: new Date() })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { ...profileFields, updatedAt: new Date() } })
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
