import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses, discountCodeRedemptions, discountCodes } from '@/db/schema';

export async function getDiscountCodeByCode(normalizedCode: string) {
  const [discountCode] = await db.select().from(discountCodes).where(eq(discountCodes.code, normalizedCode));
  return discountCode ?? null;
}

export async function getDiscountCodeById(discountCodeId: string) {
  const [discountCode] = await db.select().from(discountCodes).where(eq(discountCodes.id, discountCodeId));
  return discountCode ?? null;
}

export async function countDiscountCodeRedemptions(discountCodeId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(discountCodeRedemptions)
    .where(eq(discountCodeRedemptions.discountCodeId, discountCodeId));
  return row?.total ?? 0;
}

export async function hasUserRedeemedDiscountCode(discountCodeId: string, userId: string): Promise<boolean> {
  const [redemption] = await db
    .select({ id: discountCodeRedemptions.id })
    .from(discountCodeRedemptions)
    .where(and(eq(discountCodeRedemptions.discountCodeId, discountCodeId), eq(discountCodeRedemptions.userId, userId)));
  return !!redemption;
}

export async function listDiscountCodesWithUsage() {
  return db
    .select({
      discountCode: discountCodes,
      courseTitle: courses.title,
      redemptionCount: count(discountCodeRedemptions.id),
    })
    .from(discountCodes)
    .leftJoin(courses, eq(courses.id, discountCodes.courseId))
    .leftJoin(discountCodeRedemptions, eq(discountCodeRedemptions.discountCodeId, discountCodes.id))
    .groupBy(discountCodes.id, courses.title)
    .orderBy(desc(discountCodes.createdAt));
}

export async function listAllCoursesForDiscountPicker() {
  return db.select({ id: courses.id, title: courses.title }).from(courses).orderBy(courses.title);
}
