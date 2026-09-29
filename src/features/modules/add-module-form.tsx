'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createModule } from './module-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AddModuleForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await createModule(courseId, title);
    if (!result.success) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
      return;
    }
    setTitle('');
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input placeholder="Module title" value={title} onChange={(changeEvent) => setTitle(changeEvent.target.value)} required />
        <Button type="submit" isLoading={isSubmitting}>
          Add module
        </Button>
      </div>
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
    </form>
  );
}
