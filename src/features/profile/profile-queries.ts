import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { studentProfiles } from '@/db/schema';
import type { StudentProfile } from '@/db/schema/student-profiles';

export async function getStudentProfile(userId: string): Promise<StudentProfile | null> {
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId));
  return profile ?? null;
}

// The fields the certification paperwork actually needs — the photo is encouraged but not
// required, since it's for account personalization rather than identity verification.
const REQUIRED_PROFILE_FIELDS = [
  'legalName',
  'governmentIdType',
  'governmentIdValue',
  'gender',
  'dateOfBirth',
  'phoneNumber',
  'country',
  'state',
  'city',
  'residentialAddress',
] as const satisfies readonly (keyof StudentProfile)[];

export function isProfileComplete(profile: StudentProfile | null): boolean {
  if (!profile) return false;
  return REQUIRED_PROFILE_FIELDS.every((field) => !!profile[field]);
}
