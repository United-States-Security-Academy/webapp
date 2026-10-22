'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { revokeCourseAccess } from './user-actions';

export function RevokeCourseAccessButton({
  userId,
  courseId,
  courseTitle,
  displayName,
}: {
  userId: string;
  courseId: string;
  courseTitle: string;
  displayName: string;
}) {
  const router = useRouter();
  const [isRevoking, setIsRevoking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRevoke() {
    const confirmed = window.confirm(
      `Remove ${displayName}'s access to "${courseTitle}"? Their progress and exam attempts are kept in case you give access again.`,
    );
    if (!confirmed) return;

    setIsRevoking(true);
    setErrorMessage(null);
    const result = await revokeCourseAccess(userId, courseId);
    setIsRevoking(false);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleRevoke}
        disabled={isRevoking}
        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
      >
        {isRevoking ? 'Removing…' : 'Remove access'}
      </button>
      {errorMessage && <span className="text-xs text-red-600">{errorMessage}</span>}
    </span>
  );
}
