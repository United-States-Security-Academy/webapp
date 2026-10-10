'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Last-resort fallback for errors in the root layout itself, where error.tsx can't render. It
// replaces the whole document, so it can't rely on the app's stylesheet — styles are inline.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#0b1e3d' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#475569', maxWidth: 420 }}>
            The site hit an unexpected error. Please try again. If it keeps happening, contact info@ussa-academy.com.
          </p>
          {error.digest && <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, padding: '8px 16px', borderRadius: 6, border: 0, background: '#0b1e3d', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
