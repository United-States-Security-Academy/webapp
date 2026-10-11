import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '@/db/client';
import { enrollments, studentProfiles, users, type UserRole } from '@/db/schema';
import { isProfileComplete } from '@/features/profile/profile-queries';

export interface AdminUserListRow {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  legalName: string | null;
  photoUrl: string | null;
  hasCompleteProfile: boolean;
  enrollmentCount: number;
}

// Users with their profile basics and course count in one query, newest first.
export async function listAllUsers(searchQuery?: string, role?: UserRole): Promise<AdminUserListRow[]> {
  const conditions: SQL[] = [];
  if (searchQuery) {
    const searchCondition = or(
      ilike(users.email, `%${searchQuery}%`),
      ilike(users.displayName, `%${searchQuery}%`),
      ilike(studentProfiles.legalName, `%${searchQuery}%`),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (role) conditions.push(eq(users.role, role));

  const enrollmentCounts = db
    .select({ userId: enrollments.userId, enrollmentCount: count().as('enrollment_count') })
    .from(enrollments)
    .groupBy(enrollments.userId)
    .as('enrollment_counts');

  const rows = await db
    .select({ user: users, profile: studentProfiles, enrollmentCount: enrollmentCounts.enrollmentCount })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .leftJoin(enrollmentCounts, eq(enrollmentCounts.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(users.createdAt));

  return rows.map(({ user, profile, enrollmentCount }) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
    legalName: profile?.legalName ?? null,
    photoUrl: profile?.photoUrl ?? null,
    hasCompleteProfile: isProfileComplete(profile),
    enrollmentCount: Number(enrollmentCount ?? 0),
  }));
}

export async function countUsersByRole(): Promise<Record<UserRole | 'all', number>> {
  const rows = await db.select({ role: users.role, total: count() }).from(users).groupBy(users.role);
  const totals = { all: 0, learner: 0, instructor: 0, admin: 0 };
  for (const { role, total } of rows) {
    totals[role] = total;
    totals.all += total;
  }
  return totals;
}

export async function getUserById(userId: string) {
  const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
  return userRecord ?? null;
}
