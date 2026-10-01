import type Stripe from 'stripe';
import { db } from '@/db/client';
import { enrollments, payments } from '@/db/schema';
import { env } from '@/env';
import { ApiError, toApiErrorResponse } from '@/api-response/api-error';
import { API_ERROR_CODE } from '@/api-response/api-error-codes';
import { getStripeClient } from '@/features/payments/stripe-client';

export async function POST(request: Request) {
  try {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new ApiError(503, API_ERROR_CODE.INTERNAL_ERROR, 'Payments are not configured yet.');
    }

    const webhookRawBody = await request.text();
    const signatureHeader = request.headers.get('stripe-signature');
    if (!signatureHeader) {
      throw new ApiError(400, API_ERROR_CODE.INVALID_WEBHOOK_SIGNATURE, 'Missing Stripe signature.');
    }

    const stripe = getStripeClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(webhookRawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new ApiError(400, API_ERROR_CODE.INVALID_WEBHOOK_SIGNATURE, 'Invalid Stripe webhook signature.');
    }

    if (event.type === 'checkout.session.completed') {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const userId = checkoutSession.metadata?.userId;
      const courseId = checkoutSession.metadata?.courseId;

      if (userId && courseId) {
        // Idempotent on (provider, providerEventId) — Stripe retries webhooks, this must be safe to replay.
        await db
          .insert(payments)
          .values({
            userId,
            courseId,
            provider: 'stripe',
            providerReference: checkoutSession.id,
            providerEventId: event.id,
            amountMinor: checkoutSession.amount_total ?? 0,
            currency: (checkoutSession.currency ?? 'usd').toUpperCase(),
            status: 'succeeded',
          })
          .onConflictDoNothing({ target: [payments.provider, payments.providerEventId] });

        await db.insert(enrollments).values({ userId, courseId }).onConflictDoNothing();
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
