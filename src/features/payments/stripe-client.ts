import Stripe from 'stripe';
import { env } from '@/env';
import { ApiError } from '@/api-response/api-error';
import { API_ERROR_CODE } from '@/api-response/api-error-codes';

// Lazily constructed so importing this module never crashes an environment that hasn't
// configured Stripe yet (e.g. local dev before test keys are set, or CI).
export function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new ApiError(503, API_ERROR_CODE.INTERNAL_ERROR, 'Payments are not configured yet.');
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}
