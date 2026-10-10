import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './sentry-options';

export function register() {
  // Same settings for both server runtimes (Node.js and Edge, which runs the middleware).
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(sentryOptions);
  }
}

// Reports errors thrown while rendering pages, in Server Actions and in route handlers.
export const onRequestError = Sentry.captureRequestError;
