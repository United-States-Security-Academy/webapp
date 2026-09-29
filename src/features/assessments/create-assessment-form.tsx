'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrUpdateAssessment } from './assessment-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export function CreateAssessmentForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('Final Assessment');
  const [passingScoreInput, setPassingScoreInput] = useState('70');
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
    router.refresh();
  }

  return (
    <Card>
      <h2 className="font-semibold text-slate-900">No assessment yet</h2>
      <p className="mt-1 text-sm text-slate-500">
        Create a final assessment for this course. Students unlock it once they complete every lesson.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
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
        {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
        <Button type="submit" isLoading={isSubmitting} className="w-fit">
          Create assessment
        </Button>
      </form>
    </Card>
  );
}
