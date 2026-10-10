'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

// Shown when a page throws while rendering. Next.js keeps the real error message out of the
// browser in production; `digest` matches the entry in the server logs for tracing it.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-gold-600">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-extrabold text-navy-900">We couldn&apos;t load this page</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        This is usually temporary. Try again, and if it keeps happening, contact us at info@ussa-academy.com.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Reference: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
          Try again
        </button>
        <Link href="/" className="rounded-md border border-navy-900 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-900 hover:text-white">
          Go to homepage
        </Link>
      </div>
    </main>
  );
}
