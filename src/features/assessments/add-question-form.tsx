'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addQuestion } from './assessment-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AddQuestionForm({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [questionText, setQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await addQuestion(assessmentId, questionText);
    if (!result.success) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
      return;
    }
    setQuestionText('');
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          placeholder="Question text"
          value={questionText}
          onChange={(changeEvent) => setQuestionText(changeEvent.target.value)}
          required
        />
        <Button type="submit" isLoading={isSubmitting}>
          Add question
        </Button>
      </div>
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
    </form>
  );
}
