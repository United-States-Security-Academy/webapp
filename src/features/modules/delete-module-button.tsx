'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteModule } from './module-actions';

export function DeleteModuleButton({ moduleId, moduleTitle }: { moduleId: string; moduleTitle: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${moduleTitle}"? This removes all its lessons and learners' progress on them. This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage(null);
    const result = await deleteModule(moduleId);
    if (!result.success) {
      setErrorMessage(result.error);
      setIsDeleting(false);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
        Delete
      </Button>
      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
