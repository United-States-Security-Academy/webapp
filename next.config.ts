import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

// Baseline browser security headers for every response. No Content-Security-Policy yet: pdf.js,
// Tesseract, Cloudflare Stream, Supabase and Stripe all need carefully listed sources, so a CSP
// should be added deliberately and tested rather than guessed at here.
const SECURITY_HEADERS = [
  // Only ever load the site over HTTPS (Vercel already sends this; kept explicit for other hosts).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Stop other sites from embedding pages in an iframe (clickjacking).
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The app never uses these device features; deny them so injected scripts can't either.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Uploads source maps so stack traces show the original code. Without a token the build still
  // works; errors are still reported, just with harder-to-read stack traces.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Sends browser error reports through the site itself, so ad-blockers don't drop them.
  tunnelRoute: '/monitoring',
});
