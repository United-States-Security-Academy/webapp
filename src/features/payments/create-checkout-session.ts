'use server';

import { db } from '@/db/client';
import { discountCodeRedemptions, enrollments } from '@/db/schema';
import { env } from '@/env';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { isUserEnrolledInCourse } from '@/features/enrollments/enrollment-queries';
import { resolveDiscountForCourse } from '@/features/discounts/resolve-discount';
import { getStripeClient } from './stripe-client';

// checkoutUrl is null when a 100%-off code enrolled the learner directly, with nothing to pay.
export async function createCourseCheckoutSession(
  courseSlug: string,
  discountCodeInput?: string,
): Promise<ActionResult<{ checkoutUrl: string | null }>> {
  try {
    const authenticatedUser = await requireAuthenticatedUserFromSession();

    const courseRecord = await getCourseBySlug(courseSlug);
    if (!courseRecord) return { success: false, error: 'Course not found.' };
    if (courseRecord.status !== 'published') return { success: false, error: 'This course is not published yet.' };
    if (courseRecord.priceAmountMinor <= 0) {
      return { success: false, error: 'This course is free — use the enroll button instead.' };
    }

    const alreadyEnrolled = await isUserEnrolledInCourse(authenticatedUser.userId, courseRecord.id);
    if (alreadyEnrolled) return { success: false, error: 'You are already enrolled in this course.' };

    let amountMinor = courseRecord.priceAmountMinor;
    let discountCodeId: string | null = null;
    if (discountCodeInput?.trim()) {
      const resolved = await resolveDiscountForCourse(discountCodeInput, authenticatedUser, courseRecord);
      if (!resolved.success) return resolved;
      amountMinor = resolved.discountedAmountMinor;
      discountCodeId = resolved.discountCode.id;
    }

    if (amountMinor === 0 && discountCodeId) {
      await db.transaction(async (transaction) => {
        await transaction
          .insert(discountCodeRedemptions)
          .values({ discountCodeId, userId: authenticatedUser.userId, courseId: courseRecord.id })
          .onConflictDoNothing();
        await transaction
          .insert(enrollments)
          .values({ userId: authenticatedUser.userId, courseId: courseRecord.id })
          .onConflictDoNothing();
      });
      return { success: true, data: { checkoutUrl: null } };
    }

    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: courseRecord.currency.toLowerCase(),
            unit_amount: amountMinor,
            product_data: { name: courseRecord.title },
          },
          quantity: 1,
        },
      ],
      customer_email: authenticatedUser.email,
      client_reference_id: authenticatedUser.userId,
      metadata: {
        userId: authenticatedUser.userId,
        courseId: courseRecord.id,
        ...(discountCodeId && { discountCodeId }),
      },
      success_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/success?course=${courseRecord.slug}`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/cancel?course=${courseRecord.slug}`,
    });

    if (!checkoutSession.url) return { success: false, error: 'Failed to create checkout session.' };
    return { success: true, data: { checkoutUrl: checkoutSession.url } };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, error: error.message };
    throw error;
  }
}
