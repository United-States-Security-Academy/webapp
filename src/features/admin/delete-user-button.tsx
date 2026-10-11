'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { deleteUser } from './user-actions';

export function DeleteUserButton({
  userId,
  displayName,
  disabled,
  redirectToAfterDelete,
  label,
}: {
  userId: string;
  displayName: string;
  disabled?: boolean;
  // Used on the user's own detail page, which no longer exists once they're deleted.
  redirectToAfterDelete?: string;
  // Show a text button instead of the small icon used in the users table.
  label?: string;
}) {
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
    if (redirectToAfterDelete) router.push(redirectToAfterDelete);
    router.refresh();
  }

  if (disabled) return null;

  return (
    <div>
      {label ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {isDeleting ? 'Deleting…' : label}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Delete ${displayName}`}
          className="text-slate-400 hover:text-red-600 disabled:opacity-50"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
      {errorMessage && <p className="mt-1 max-w-[16rem] text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
