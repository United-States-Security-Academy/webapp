'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCourse } from '@/features/courses/course-actions';
import { createCourseThumbnailUploadTarget } from '@/features/courses/course-thumbnail-actions';
import { COURSE_CATEGORIES, COURSE_CATEGORY_META } from '@/features/courses/course-category';
import type { CourseCategory } from '@/features/courses/course-types';
import { getSupabaseBrowserClient } from '@/supabase/browser-client';
import { slugify } from '@/slugify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

function formatDollarPreview(priceInput: string, currency: string): string {
  const amount = Number.parseFloat(priceInput);
  if (!priceInput || Number.isNaN(amount) || amount <= 0) return 'This course will be free to enroll in.';
  return `Learners will be charged ${amount.toFixed(2)} ${currency || 'USD'} to enroll.`;
}

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [hasEditedSlugManually, setHasEditedSlugManually] = useState(false);
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState<CourseCategory>('security');
  const [priceInput, setPriceInput] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Create course');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    if (!hasEditedSlugManually) setSlug(slugify(newTitle));
  }

  function handleSlugChange(newSlug: string) {
    setHasEditedSlugManually(true);
    setSlug(slugify(newSlug));
  }

  function handleThumbnailChange(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = changeEvent.target.files?.[0] ?? null;
    setThumbnailFile(selectedFile);
    setThumbnailPreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : null);
  }

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusText('Creating course...');

    const priceAmountMinor = Math.round((Number.parseFloat(priceInput) || 0) * 100);
    const createResult = await createCourse({ title, slug, summary, category, priceAmountMinor, currency });
    if (!createResult.success) {
      setErrorMessage(createResult.error);
      setStatusText('Create course');
      setIsSubmitting(false);
      return;
    }
    const createdCourse = createResult.data;

    try {
      if (thumbnailFile) {
        setStatusText('Uploading thumbnail...');
        const targetResult = await createCourseThumbnailUploadTarget(createdCourse.id);
        if (!targetResult.success) throw new Error(targetResult.error);
        const { path, token } = targetResult.data;
        const supabaseBrowserClient = getSupabaseBrowserClient();
        await supabaseBrowserClient.storage.from('course-thumbnails').uploadToSignedUrl(path, token, thumbnailFile, { upsert: true });
      }

      router.push(`/instructor/courses/${createdCourse.slug}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Course created, but the thumbnail upload failed.');
      setStatusText('Create course');
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Card>
        <h1 className="text-xl font-semibold text-slate-900">New course</h1>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Title</label>
            <Input
              placeholder="e.g. Security Officer Certification"
              value={title}
              onChange={(changeEvent) => handleTitleChange(changeEvent.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Slug</label>
            <Input
              placeholder="security-officer-certification"
              value={slug}
              onChange={(changeEvent) => handleSlugChange(changeEvent.target.value)}
              required
            />
            <p className="mt-1 text-xs text-slate-400">This course will live at /courses/{slug || '...'}</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Summary</label>
            <Input
              placeholder="A one-sentence description shown on the course card"
              value={summary}
              onChange={(changeEvent) => setSummary(changeEvent.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Category</label>
            <select
              value={category}
              onChange={(changeEvent) => setCategory(changeEvent.target.value as CourseCategory)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              required
            >
              {COURSE_CATEGORIES.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption}>
                  {COURSE_CATEGORY_META[categoryOption].label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Price</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 49.99"
                value={priceInput}
                onChange={(changeEvent) => setPriceInput(changeEvent.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Currency</label>
              <Input placeholder="USD" value={currency} onChange={(changeEvent) => setCurrency(changeEvent.target.value)} required />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-500">{formatDollarPreview(priceInput, currency)} Enter 0 for a free course.</p>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Course thumbnail <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              {thumbnailPreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a static asset
                <img src={thumbnailPreviewUrl} alt="" className="h-16 w-24 rounded-md object-cover" />
              )}
              <label className="inline-flex w-fit cursor-pointer items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                {thumbnailFile ? 'Change image' : 'Choose image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
              </label>
            </div>
            <p className="mt-1 text-xs text-slate-400">Shown on the course card in the catalog. You can also add or replace it later.</p>
          </div>

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
          <Button type="submit" isLoading={isSubmitting}>
            {statusText}
          </Button>
        </form>
      </Card>
    </main>
  );
}
