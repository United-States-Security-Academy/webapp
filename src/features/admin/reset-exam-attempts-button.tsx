'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetExamAttempts } from './user-actions';

export function ResetExamAttemptsButton({
  userId,
  courseId,
  displayName,
  maxAttempts,
}: {
  userId: string;
  courseId: string;
  displayName: string;
  maxAttempts: number;
}) {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleReset() {
    const confirmed = window.confirm(
      `Give ${displayName} a fresh set of ${maxAttempts} exam attempts for this course? Their earlier attempts stay on record.`,
    );
    if (!confirmed) return;

    setIsResetting(true);
    setErrorMessage(null);
    const result = await resetExamAttempts(userId, courseId);
    setIsResetting(false);
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
        onClick={handleReset}
        disabled={isResetting}
        className="text-xs font-semibold text-navy-800 hover:underline disabled:opacity-50"
      >
        {isResetting ? 'Resetting…' : 'Reset attempts'}
      </button>
      {errorMessage && <span className="text-xs text-red-600">{errorMessage}</span>}
    </span>
  );
}
