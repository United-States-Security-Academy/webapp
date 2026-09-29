'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateCourse } from './course-actions';
import { COURSE_CATEGORIES, COURSE_CATEGORY_META } from './course-category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Course, CourseCategory } from './course-types';

function formatDollarPreview(priceInput: string, currency: string): string {
  const amount = Number.parseFloat(priceInput);
  if (!priceInput || Number.isNaN(amount) || amount <= 0) return 'This course will be free to enroll in.';
  return `Learners will be charged ${amount.toFixed(2)} ${currency || 'USD'} to enroll.`;
}

export function EditCourseForm({ course }: { course: Course }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [summary, setSummary] = useState(course.summary ?? '');
  const [category, setCategory] = useState<CourseCategory>(course.category);
  const [priceInput, setPriceInput] = useState((course.priceAmountMinor / 100).toFixed(2));
  const [currency, setCurrency] = useState(course.currency);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const priceAmountMinor = Math.round((Number.parseFloat(priceInput) || 0) * 100);
    const result = await updateCourse(course.id, { title, summary, category, priceAmountMinor, currency });
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
      <Button variant="outline" onClick={() => setIsEditing(true)}>
        Edit details
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Title</label>
        <Input value={title} onChange={(changeEvent) => setTitle(changeEvent.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Summary</label>
        <Input value={summary} onChange={(changeEvent) => setSummary(changeEvent.target.value)} />
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
      <div className="flex gap-2">
        <Button type="submit" isLoading={isSubmitting}>
          Save changes
        </Button>
        <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
    </form>
  );
}
