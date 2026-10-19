'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StructuredLessonContent, StructuredQuizAnswer } from '@/db/schema/structured-courses';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { LessonPlayer } from './player/lesson-player';
import { completeStructuredLesson } from './structured-lesson-progress-actions';

type SaveStatus = 'idle' | 'saving' | 'error';

export interface LessonNavLink {
  href: string;
  title: string;
}

// The student's lesson: the shared lesson player, plus the button that completes it. A lesson
// counts as done when the student presses "Complete and continue", which is enabled once every
// inline quiz is answered correctly; the server checks the answers again before saving. A
// completed lesson opens fully unlocked, to revisit, with a plain Next button.
export function StructuredLessonView({
  moduleId,
  lesson,
  imageUrls,
  isCompleted,
  previous,
  next,
  courseHref,
}: {
  moduleId: string;
  lesson: StructuredLessonContent;
  imageUrls: Record<string, string>;
  isCompleted: boolean;
  previous: LessonNavLink | null;
  // null on the last lesson of the course, which leads back to the course page instead.
  next: LessonNavLink | null;
  courseHref: string;
}) {
  const router = useRouter();
  const [areQuizzesPassed, setAreQuizzesPassed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Every option picked per question, in order: "blockIndex/questionIndex" -> option indexes.
  const answersRef = useRef(new Map<string, StructuredQuizAnswer>());

  const handleQuizAnswer = useCallback((blockIndex: number, questionIndex: number, optionIndex: number) => {
    const key = `${blockIndex}/${questionIndex}`;
    const answer = answersRef.current.get(key) ?? { blockIndex, questionIndex, selectedOptionIndexes: [] };
    answersRef.current.set(key, { ...answer, selectedOptionIndexes: [...answer.selectedOptionIndexes, optionIndex] });
  }, []);
  const handleAllQuizzesPassed = useCallback(() => setAreQuizzesPassed(true), []);

  const continueHref = next?.href ?? courseHref;

  async function completeAndContinue() {
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      const result = await completeStructuredLesson({ moduleId, lessonKey: lesson.key, quizAnswers: [...answersRef.current.values()] });
      if (!result.success) {
        setSaveStatus('error');
        setErrorMessage(result.error);
        return;
      }
    } catch (error) {
      console.error('Failed to save lesson progress:', error);
      setSaveStatus('error');
      setErrorMessage('Your progress could not be saved. Check your connection and try again.');
      return;
    }
    // The next page is rendered fresh, so its progress bar and ticks include this lesson. Stays
    // 'saving' (button disabled) until the navigation happens.
    router.push(continueHref);
  }

  const nextTitle = next?.title ?? 'Back to the course';
  const primaryClassName =
    'theme-fixed flex min-h-[3.5rem] flex-col items-end justify-center rounded-lg border border-navy-800 bg-navy-900 px-3 py-2 text-right text-white';

  return (
    <div>
      <LessonPlayer
        lesson={lesson}
        imageUrls={imageUrls}
        showLockedContent={isCompleted}
        onAllQuizzesPassed={handleAllQuizzesPassed}
        onQuizAnswer={handleQuizAnswer}
      />

      <div aria-live="polite" className="mt-8">
        {isCompleted && (
          <p className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            <Icon name="checkCircle" className="h-5 w-5" />
            You have completed this lesson.
          </p>
        )}
        {saveStatus === 'error' && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessage ?? 'Your progress could not be saved.'}</p>
        )}
      </div>

      <nav aria-label="Lesson navigation" className="mt-8 grid grid-cols-2 gap-3 border-t border-slate-200 pt-6">
        {previous ? (
          <Link
            href={previous.href}
            className="flex min-h-[3.5rem] flex-col justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-navy-800"
          >
            <span className="text-xs text-slate-500">&larr; Previous</span>
            <span className="line-clamp-2 text-sm font-medium text-slate-900">{previous.title}</span>
          </Link>
        ) : (
          <span />
        )}

        {isCompleted ? (
          <Link href={continueHref} className={`${primaryClassName} hover:bg-navy-800`}>
            <span className="text-xs text-white/70">{next ? 'Next' : 'Finished'} &rarr;</span>
            <span className="line-clamp-2 text-sm font-medium">{nextTitle}</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void completeAndContinue()}
            disabled={!areQuizzesPassed || saveStatus === 'saving'}
            className={`${primaryClassName} enabled:hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gold-400">
              {saveStatus === 'saving' && <Spinner className="h-3 w-3" />}
              {saveStatus === 'saving' ? 'Saving...' : next ? 'Complete and continue' : 'Complete and finish'} &rarr;
            </span>
            <span className="line-clamp-2 text-sm font-medium">{nextTitle}</span>
          </button>
        )}
      </nav>
      {!isCompleted && !areQuizzesPassed && (
        <p className="mt-2 text-right text-xs text-slate-500">Answer the practice questions above to continue.</p>
      )}
    </div>
  );
}
