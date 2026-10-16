'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInView } from 'framer-motion';
import type { StructuredLessonContent, StructuredQuizAnswer } from '@/db/schema/structured-courses';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { LessonPlayer } from './player/lesson-player';
import { completeStructuredLesson } from './structured-lesson-progress-actions';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// The student's lesson: the shared lesson player, plus completion. A lesson is complete once the
// student has scrolled to its end and answered every inline quiz correctly; that is then saved
// on the server, which checks the answers again. A completed lesson opens fully unlocked, to review.
export function StructuredLessonView({
  moduleId,
  lesson,
  imageUrls,
  isCompleted,
}: {
  moduleId: string;
  lesson: StructuredLessonContent;
  imageUrls: Record<string, string>;
  isCompleted: boolean;
}) {
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const hasReachedEnd = useInView(endRef, { once: true });
  const [areQuizzesPassed, setAreQuizzesPassed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(isCompleted ? 'saved' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasJustCompleted, setHasJustCompleted] = useState(false);
  // Every option picked per question, in order: "blockIndex/questionIndex" -> option indexes.
  const answersRef = useRef(new Map<string, StructuredQuizAnswer>());

  const handleQuizAnswer = useCallback((blockIndex: number, questionIndex: number, optionIndex: number) => {
    const key = `${blockIndex}/${questionIndex}`;
    const answer = answersRef.current.get(key) ?? { blockIndex, questionIndex, selectedOptionIndexes: [] };
    answersRef.current.set(key, { ...answer, selectedOptionIndexes: [...answer.selectedOptionIndexes, optionIndex] });
  }, []);
  const handleAllQuizzesPassed = useCallback(() => setAreQuizzesPassed(true), []);

  const saveCompletion = useCallback(async () => {
    setSaveStatus('saving');
    setErrorMessage(null);
    const result = await completeStructuredLesson({ moduleId, lessonKey: lesson.key, quizAnswers: [...answersRef.current.values()] });
    if (!result.success) {
      setSaveStatus('error');
      setErrorMessage(result.error);
      return;
    }
    setSaveStatus('saved');
    setHasJustCompleted(true);
    // Updates the progress bar, the ticks and the exam/certificate links on the page.
    router.refresh();
  }, [lesson.key, moduleId, router]);

  useEffect(() => {
    if (hasReachedEnd && areQuizzesPassed && saveStatus === 'idle') void saveCompletion();
  }, [areQuizzesPassed, hasReachedEnd, saveCompletion, saveStatus]);

  return (
    <div>
      <LessonPlayer
        lesson={lesson}
        imageUrls={imageUrls}
        showLockedContent={isCompleted}
        onAllQuizzesPassed={handleAllQuizzesPassed}
        onQuizAnswer={handleQuizAnswer}
      />
      <div ref={endRef} aria-hidden className="h-px" />

      <div aria-live="polite" className="mt-8">
        {saveStatus === 'saved' && (
          <p className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            <Icon name="checkCircle" className="h-5 w-5" />
            {hasJustCompleted ? 'Lesson complete. Well done!' : 'You have completed this lesson.'}
          </p>
        )}
        {saveStatus === 'saving' && <p className="text-sm text-slate-500">Saving your progress...</p>}
        {saveStatus === 'error' && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            <p>{errorMessage ?? 'Your progress could not be saved.'}</p>
            <Button variant="outline" onClick={() => void saveCompletion()}>
              Try again
            </Button>
          </div>
        )}
        {saveStatus === 'idle' && !areQuizzesPassed && hasReachedEnd && (
          <p className="text-sm text-slate-500">Answer the practice questions above to complete this lesson.</p>
        )}
      </div>
    </div>
  );
}
