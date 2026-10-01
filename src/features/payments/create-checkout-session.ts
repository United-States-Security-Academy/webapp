'use server';

import { env } from '@/env';
import { ApiError } from '@/api-response/api-error';
import type { ActionResult } from '@/api-response/action-result';
import { requireAuthenticatedUserFromSession } from '@/features/auth/require-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { isUserEnrolledInCourse } from '@/features/enrollments/enrollment-queries';
import { getStripeClient } from './stripe-client';

export async function createCourseCheckoutSession(courseSlug: string): Promise<ActionResult<{ checkoutUrl: string }>> {
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

    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: courseRecord.currency.toLowerCase(),
            unit_amount: courseRecord.priceAmountMinor,
            product_data: { name: courseRecord.title },
          },
          quantity: 1,
        },
      ],
      customer_email: authenticatedUser.email,
      client_reference_id: authenticatedUser.userId,
      metadata: { userId: authenticatedUser.userId, courseId: courseRecord.id },
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
