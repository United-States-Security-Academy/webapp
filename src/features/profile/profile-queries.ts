import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { studentProfiles } from '@/db/schema';
import type { StudentProfile } from '@/db/schema/student-profiles';

// cache(): the dashboard layout and page both need the profile; this loads it once per request.
export const getStudentProfile = cache(async (userId: string): Promise<StudentProfile | null> => {
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId));
  return profile ?? null;
});

// The fields the certification paperwork actually needs — the photo is encouraged but not
// required, since it's for account personalization rather than identity verification.
const REQUIRED_PROFILE_FIELDS = [
  'legalName',
  'governmentIdType',
  'governmentIdValue',
  'phoneNumber',
  'country',
  'state',
  'city',
  'residentialAddress',
] as const satisfies readonly (keyof StudentProfile)[];

export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

export function getMissingProfileFields(profile: StudentProfile | null): RequiredProfileField[] {
  return REQUIRED_PROFILE_FIELDS.filter((field) => !profile?.[field]);
}

export function isProfileComplete(profile: StudentProfile | null): boolean {
  return getMissingProfileFields(profile).length === 0;
}
