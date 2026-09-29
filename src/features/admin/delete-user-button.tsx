'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { deleteUser } from './user-actions';

export function DeleteUserButton({ userId, displayName, disabled }: { userId: string; displayName: string; disabled?: boolean }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${displayName}'s account? This removes their sign-in and all of their enrollments, progress, and assessment attempts. This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage(null);
    const result = await deleteUser(userId);
    if (!result.success) {
      setErrorMessage(result.error);
      setIsDeleting(false);
      return;
    }
    router.refresh();
  }

  if (disabled) return null;

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={`Delete ${displayName}`}
        className="text-slate-400 hover:text-red-600 disabled:opacity-50"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
      {errorMessage && <p className="mt-1 max-w-[16rem] text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
