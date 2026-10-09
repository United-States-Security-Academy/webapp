'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { discountCodes } from '@/db/schema';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { requireRole } from '@/features/auth/require-role';
import { getCourseById, getCourseBySlug } from '@/features/courses/course-queries';
import { formatCoursePrice } from '@/features/courses/format-course-price';
import { normalizeDiscountCode } from './discount-pricing';
import { getDiscountCodeByCode } from './discount-queries';
import { resolveDiscountForCourse } from './resolve-discount';

const DISCOUNT_CODE_PATTERN = /^[A-Z0-9_-]{3,40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CreateDiscountCodeInput = {
  code: string;
  percentOff: number;
  courseId: string | null;
  allowedEmailsText: string;
  maxRedemptions: number | null;
  expiresOn: string | null;
};

export async function createDiscountCode(input: CreateDiscountCodeInput): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    requireRole(authenticatedUser, ['admin']);

    const code = normalizeDiscountCode(input.code);
    if (!DISCOUNT_CODE_PATTERN.test(code)) {
      return { success: false, error: 'Code must be 3–40 letters, numbers, hyphens or underscores.' };
    }
    if (!Number.isInteger(input.percentOff) || input.percentOff < 1 || input.percentOff > 100) {
      return { success: false, error: 'Percentage off must be a whole number from 1 to 100.' };
    }
    if (input.maxRedemptions !== null && (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1)) {
      return { success: false, error: 'Usage limit must be a whole number of at least 1, or left blank.' };
    }
    if (input.courseId && !(await getCourseById(input.courseId))) {
      return { success: false, error: 'Course not found.' };
    }

    const allowedEmails = [
      ...new Set(
        input.allowedEmailsText
          .split(/[\s,;]+/)
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    const invalidEmail = allowedEmails.find((email) => !EMAIL_PATTERN.test(email));
    if (invalidEmail) return { success: false, error: `"${invalidEmail}" is not a valid email address.` };

    // An expiry date means the code works through the end of that day (UTC).
    const expiresAt = input.expiresOn ? new Date(`${input.expiresOn}T23:59:59.999Z`) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) return { success: false, error: 'Expiry date is not valid.' };

    if (await getDiscountCodeByCode(code)) return { success: false, error: 'A discount code with this name already exists.' };

    await db.insert(discountCodes).values({
      code,
      percentOff: input.percentOff,
      courseId: input.courseId,
      allowedEmails,
      maxRedemptions: input.maxRedemptions,
      expiresAt,
    });
    revalidatePath('/admin/discounts');
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function setDiscountCodeActive(discountCodeId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    requireRole(authenticatedUser, ['admin']);

    await db.update(discountCodes).set({ isActive }).where(eq(discountCodes.id, discountCodeId));
    revalidatePath('/admin/discounts');
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function deleteDiscountCode(discountCodeId: string): Promise<ActionResult> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    requireRole(authenticatedUser, ['admin']);

    await db.delete(discountCodes).where(eq(discountCodes.id, discountCodeId));
    revalidatePath('/admin/discounts');
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}

export async function previewDiscountCode(
  courseSlug: string,
  rawCode: string,
): Promise<ActionResult<{ percentOff: number; discountedPriceLabel: string }>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();
    const courseRecord = await getCourseBySlug(courseSlug);
    if (!courseRecord || courseRecord.status !== 'published') return { success: false, error: 'Course not found.' };

    const resolved = await resolveDiscountForCourse(rawCode, authenticatedUser, courseRecord);
    if (!resolved.success) return resolved;
    return {
      success: true,
      data: {
        percentOff: resolved.discountCode.percentOff,
        discountedPriceLabel: formatCoursePrice(resolved.discountedAmountMinor, courseRecord.currency),
      },
    };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
