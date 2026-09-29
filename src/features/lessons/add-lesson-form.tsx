'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLesson } from './lesson-actions';
import { slugify } from '@/slugify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AddLessonForm({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [hasEditedSlugManually, setHasEditedSlugManually] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [contentType, setContentType] = useState<'video' | 'pdf'>('video');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    if (!hasEditedSlugManually) setSlug(slugify(newTitle));
  }

  function handleSlugChange(newSlug: string) {
    setHasEditedSlugManually(true);
    setSlug(slugify(newSlug));
  }

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await createLesson(moduleId, { title, slug, isPreview, contentType });
    if (!result.success) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
      return;
    }
    setTitle('');
    setSlug('');
    setHasEditedSlugManually(false);
    setIsPreview(false);
    setContentType('video');
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Lesson title" value={title} onChange={(changeEvent) => handleTitleChange(changeEvent.target.value)} required />
        <Input placeholder="Lesson slug" value={slug} onChange={(changeEvent) => handleSlugChange(changeEvent.target.value)} required />
        <select
          value={contentType}
          onChange={(changeEvent) => setContentType(changeEvent.target.value as 'video' | 'pdf')}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        >
          <option value="video">Video</option>
          <option value="pdf">PDF</option>
        </select>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          <input type="checkbox" checked={isPreview} onChange={(changeEvent) => setIsPreview(changeEvent.target.checked)} />
          Preview
        </label>
        <Button type="submit" isLoading={isSubmitting}>
          Add lesson
        </Button>
      </div>
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
    </form>
  );
}
