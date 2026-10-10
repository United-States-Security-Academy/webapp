'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { startTimedAssessment } from './submit-assessment-action';

// Shown before a timed assessment, so the clock only starts when the learner is ready.
export function StartTimedAssessment({
  courseId,
  timeLimitMinutes,
  questionCount,
}: {
  courseId: string;
  timeLimitMinutes: number;
  questionCount: number;
}) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleStart() {
    setIsStarting(true);
    setErrorMessage(null);
    const result = await startTimedAssessment(courseId);
    if (!result.success) {
      setErrorMessage(result.error);
      setIsStarting(false);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-400">
          <Icon name="clock" className="h-5 w-5" />
        </span>
        <div>
          <p className="font-bold text-navy-900">This is a timed assessment</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>
              You&apos;ll have <span className="font-semibold text-navy-900">{timeLimitMinutes} minutes</span> to answer{' '}
              {questionCount} questions.
            </li>
            <li>The timer starts when you press Start and keeps running if you leave or refresh the page.</li>
            <li>Your answers are saved as you go. When time runs out, they are submitted automatically.</li>
            <li>Questions you haven&apos;t answered by then count as incorrect.</li>
          </ul>
          <Button onClick={handleStart} isLoading={isStarting} className="mt-4">
            Start assessment
          </Button>
          {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
        </div>
      </div>
    </Card>
  );
}
