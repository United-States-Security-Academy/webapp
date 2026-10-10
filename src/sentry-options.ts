// Shared Sentry settings for the browser, Node.js server and Edge runtimes. Reads process.env
// directly rather than '@/env', because this file is also bundled into the browser, where the
// server-only variables that '@/env' validates don't exist.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const sentryOptions = {
  dsn,
  // Off until a DSN is configured, and never from local development, so dev errors don't
  // pollute the live project.
  enabled: Boolean(dsn) && process.env.NODE_ENV === 'production',
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // Performance tracing on a 10% sample keeps usage within Sentry's free tier.
  tracesSampleRate: 0.1,
  // Students' records include government IDs and home addresses: never attach cookies, IP
  // addresses or request bodies to events.
  sendDefaultPii: false,
};
