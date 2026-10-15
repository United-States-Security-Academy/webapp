'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL_MS = 5000;

// Rendered only while an upload is processing (e.g. one started in another tab), so its status
// changes to ready or failed on this page without a manual reload.
export function ProcessingStatusRefresher() {
  const router = useRouter();
  useEffect(() => {
    const intervalId = window.setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [router]);
  return null;
}
