import type { Course } from '@/features/courses/course-types';
import type { AuthenticatedUser } from '@/features/auth/auth-types';
import type { DiscountCode } from '@/db/schema';
import { applyPercentOff, MIN_CARD_CHARGE_MINOR, normalizeDiscountCode } from './discount-pricing';
import { countDiscountCodeRedemptions, getDiscountCodeByCode, hasUserRedeemedDiscountCode } from './discount-queries';

type ResolvedDiscount =
  | { success: true; discountCode: DiscountCode; discountedAmountMinor: number }
  | { success: false; error: string };

// The single place a code is checked — used both for the learner's price preview and again at
// checkout time, so a code that was valid when previewed is re-verified before anyone is charged.
export async function resolveDiscountForCourse(
  rawCode: string,
  authenticatedUser: AuthenticatedUser,
  courseRecord: Course,
): Promise<ResolvedDiscount> {
  const discountCode = await getDiscountCodeByCode(normalizeDiscountCode(rawCode));
  const invalid = { success: false as const, error: 'This discount code is not valid.' };

  if (!discountCode || !discountCode.isActive) return invalid;
  if (discountCode.courseId && discountCode.courseId !== courseRecord.id) {
    return { success: false, error: 'This discount code does not apply to this course.' };
  }
  if (discountCode.expiresAt && discountCode.expiresAt.getTime() < Date.now()) {
    return { success: false, error: 'This discount code has expired.' };
  }
  if (
    discountCode.allowedEmails.length > 0 &&
    !discountCode.allowedEmails.includes(authenticatedUser.email.toLowerCase())
  ) {
    return invalid;
  }
  if (await hasUserRedeemedDiscountCode(discountCode.id, authenticatedUser.userId)) {
    return { success: false, error: 'You have already used this discount code.' };
  }
  if (
    discountCode.maxRedemptions !== null &&
    (await countDiscountCodeRedemptions(discountCode.id)) >= discountCode.maxRedemptions
  ) {
    return { success: false, error: 'This discount code has reached its usage limit.' };
  }

  const discountedAmountMinor = applyPercentOff(courseRecord.priceAmountMinor, discountCode.percentOff);
  if (discountedAmountMinor > 0 && discountedAmountMinor < MIN_CARD_CHARGE_MINOR) {
    return { success: false, error: 'This discount brings the price below the minimum card payment.' };
  }
  return { success: true, discountCode, discountedAmountMinor };
}
