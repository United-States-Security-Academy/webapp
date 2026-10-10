'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveTimedAssessmentDraft, submitAssessmentAttempt, type SubmittedAnswer } from './submit-assessment-action';
import { Button } from '@/components/ui/button';
import type { AssessmentForLearner } from './assessment-types';

const DRAFT_SAVE_DELAY_MS = 600;
const WARNING_MS = 5 * 60_000;
const URGENT_MS = 60_000;

// Counts down from the time that was left when the page loaded. Measured against this device's own
// clock from that moment, so a wrong system clock doesn't matter; the server enforces the real deadline.
function useCountdown(remainingMsAtLoad: number | undefined): number | null {
  const [remainingMs, setRemainingMs] = useState(remainingMsAtLoad ?? null);
  useEffect(() => {
    if (remainingMsAtLoad === undefined) return;
    const endsAt = Date.now() + remainingMsAtLoad;
    const tick = () => setRemainingMs(Math.max(0, endsAt - Date.now()));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [remainingMsAtLoad]);
  return remainingMs;
}

function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function AssessmentAttemptForm({
  courseId,
  courseSlug,
  assessment,
  timer,
  initialAnswers,
}: {
  courseId: string;
  courseSlug: string;
  assessment: AssessmentForLearner;
  // Present for a timed attempt that's in progress.
  timer?: { remainingMsAtLoad: number };
  initialAnswers?: Record<string, string>;
}) {
  const router = useRouter();
  const [selectedChoiceByQuestionId, setSelectedChoiceByQuestionId] = useState<Record<string, string>>(initialAnswers ?? {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isSubmittingRef = useRef(false);
  const hasEditedRef = useRef(false);

  const remainingMs = useCountdown(timer?.remainingMsAtLoad);
  const isTimeUp = remainingMs === 0;
  const answeredCount = assessment.questions.filter((question) => !!selectedChoiceByQuestionId[question.id]).length;
  const hasAnsweredEveryQuestion = answeredCount === assessment.questions.length;

  async function submitAnswers({ isAutomatic }: { isAutomatic: boolean }) {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    const answers: SubmittedAnswer[] = assessment.questions.flatMap((question) => {
      const selectedChoiceId = selectedChoiceByQuestionId[question.id];
      return selectedChoiceId ? [{ questionId: question.id, selectedChoiceId }] : [];
    });
    const result = await submitAssessmentAttempt(courseId, answers);
    if (!result.success) {
      setErrorMessage(
        isAutomatic ? `Time is up, but we couldn't submit your answers: ${result.error} Please try again.` : result.error,
      );
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    router.push(`/dashboard/courses/${courseSlug}/assessment/results/${result.data.id}${isAutomatic ? '?timeUp=1' : ''}`);
  }

  // Auto-submit the moment the countdown reaches zero.
  useEffect(() => {
    if (isTimeUp) void submitAnswers({ isAutomatic: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when time runs out
  }, [isTimeUp]);

  // Save picks to the server shortly after each change (timed attempts only), so an attempt can be
  // graded on these answers even if the tab is closed before time runs out.
  useEffect(() => {
    if (!timer || !hasEditedRef.current || isTimeUp) return;
    setDraftStatus('saving');
    const saveTimeout = setTimeout(async () => {
      const result = await saveTimedAssessmentDraft(courseId, selectedChoiceByQuestionId);
      setDraftStatus(result.success ? 'saved' : 'error');
    }, DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(saveTimeout);
  }, [selectedChoiceByQuestionId, timer, courseId, isTimeUp]);

  function handleSelect(questionId: string, choiceId: string) {
    hasEditedRef.current = true;
    setSelectedChoiceByQuestionId((current) => ({ ...current, [questionId]: choiceId }));
  }

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    void submitAnswers({ isAutomatic: false });
  }

  const timerTone =
    remainingMs === null
      ? ''
      : remainingMs <= URGENT_MS
        ? 'bg-red-600 text-white'
        : remainingMs <= WARNING_MS
          ? 'bg-amber-400 text-navy-950'
          : 'bg-navy-900 text-white';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {remainingMs !== null && (
        <div className={`sticky top-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-3 shadow-md ${timerTone}`}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Time left</p>
            <p className="font-mono text-2xl font-bold tabular-nums" role="timer" aria-label={`Time left ${formatRemaining(remainingMs)}`}>
              {formatRemaining(remainingMs)}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">
              {answeredCount} of {assessment.questions.length} answered
            </p>
            <p className="opacity-80">
              {isTimeUp
                ? errorMessage
                  ? 'Time is up — not submitted yet'
                  : 'Submitting your answers…'
                : draftStatus === 'saving'
                  ? 'Saving…'
                  : draftStatus === 'saved'
                    ? 'Answers saved'
                    : draftStatus === 'error'
                      ? 'Not saved — check your connection'
                      : 'Submits automatically when time runs out'}
            </p>
          </div>
          {/* Screen readers hear these thresholds once, rather than every second of the countdown. */}
          <p className="sr-only" aria-live="assertive">
            {isTimeUp ? 'Time is up. Submitting your answers.' : remainingMs <= URGENT_MS ? 'One minute left.' : remainingMs <= WARNING_MS ? 'Five minutes left.' : ''}
          </p>
        </div>
      )}

      {assessment.questions.map((question, index) => (
        <div key={question.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-900">
            {index + 1}. {question.questionText}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {question.choices.map((choice) => (
              <label key={choice.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={choice.id}
                  checked={selectedChoiceByQuestionId[question.id] === choice.id}
                  onChange={() => handleSelect(question.id, choice.id)}
                  disabled={isTimeUp || isSubmitting}
                  className="h-4 w-4 accent-navy-800"
                />
                {choice.choiceText}
              </label>
            ))}
          </div>
        </div>
      ))}

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      {isTimeUp && errorMessage ? (
        <Button type="button" onClick={() => void submitAnswers({ isAutomatic: true })} isLoading={isSubmitting} className="w-fit">
          Try submitting again
        </Button>
      ) : (
        <Button type="submit" isLoading={isSubmitting} disabled={!hasAnsweredEveryQuestion || isTimeUp} className="w-fit">
          Submit assessment
        </Button>
      )}
    </form>
  );
}
