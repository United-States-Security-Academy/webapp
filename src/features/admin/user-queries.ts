import { and, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';

export async function listAllUsers(searchQuery?: string) {
  const conditions = searchQuery
    ? [or(ilike(users.email, `%${searchQuery}%`), ilike(users.displayName, `%${searchQuery}%`))]
    : [];
  return db
    .select()
    .from(users)
    .where(and(...conditions))
    .orderBy(users.createdAt);
}

export async function getUserById(userId: string) {
  const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
  return userRecord ?? null;
}
