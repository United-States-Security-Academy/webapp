'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateModuleTitle } from './module-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function EditModuleTitleForm({ moduleId, currentTitle }: { moduleId: string; currentTitle: string }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleCancel() {
    setTitle(currentTitle);
    setErrorMessage(null);
    setIsEditing(false);
  }

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await updateModuleTitle(moduleId, title);
    if (!result.success) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
      return;
    }
    setIsEditing(false);
    setIsSubmitting(false);
    router.refresh();
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-slate-900">{currentTitle}</h3>
        <Button variant="outline" onClick={() => setIsEditing(true)}>
          Rename
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input value={title} onChange={(changeEvent) => setTitle(changeEvent.target.value)} required autoFocus />
        <Button type="submit" isLoading={isSubmitting}>
          Save
        </Button>
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
    </form>
  );
}
