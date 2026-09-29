'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrUpdateAssessment } from './assessment-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CourseAssessment } from './assessment-types';

export function AssessmentSettingsForm({ courseId, assessment }: { courseId: string; assessment: CourseAssessment }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(assessment.title);
  const [passingScoreInput, setPassingScoreInput] = useState(String(assessment.passingScorePercentage));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const passingScorePercentage = Math.min(100, Math.max(0, Number.parseInt(passingScoreInput, 10) || 0));
    const result = await createOrUpdateAssessment(courseId, { title, passingScorePercentage });
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{assessment.title}</h1>
          <p className="text-sm text-slate-500">Passing score: {assessment.passingScorePercentage}%</p>
        </div>
        <Button variant="outline" onClick={() => setIsEditing(true)}>
          Edit settings
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Title</label>
        <Input value={title} onChange={(changeEvent) => setTitle(changeEvent.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Passing score (%)</label>
        <Input
          type="number"
          min="0"
          max="100"
          value={passingScoreInput}
          onChange={(changeEvent) => setPassingScoreInput(changeEvent.target.value)}
          required
        />
      </div>
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
