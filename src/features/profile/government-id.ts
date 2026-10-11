import type { StudentProfile } from '@/db/schema/student-profiles';

export type GovernmentIdType = NonNullable<StudentProfile['governmentIdType']>;

export const GOVERNMENT_ID_LABEL: Record<GovernmentIdType, string> = {
  ssnLastFour: 'Last 4 digits of SSN',
  texasDriversLicense: 'Texas Driver License number',
  texasIdCard: 'Texas Identification Card number',
};

// Shown in place of the real number until an admin deliberately reveals it: only the last two
// characters stay visible, so the right record can be recognized without exposing the ID.
export function maskGovernmentId(value: string): string {
  const visibleCount = Math.min(2, Math.floor(value.length / 3));
  return '•'.repeat(value.length - visibleCount) + value.slice(value.length - visibleCount);
}
