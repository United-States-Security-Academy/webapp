'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import type { StructuredBlock, StructuredLessonContent } from '@/db/schema/structured-courses';
import { Icon } from '@/components/ui/icon';
import { HeadingBlock } from './heading-block';
import { TextBlock } from './text-block';
import { StepsBlock } from './steps-block';
import { PointsBlock } from './points-block';
import { TableBlock } from './table-block';
import { ImageBlock } from './image-block';
import { CalloutBlock } from './callout-block';
import { QuizBlock } from './quiz-block';
import { getFirstLockedBlockIndex } from './lesson-gate';
import { LessonAudioPlayer } from './lesson-audio-player';
import { lessonToSpeechSegments } from './lesson-speech';

export interface LessonPlayerProps {
  lesson: StructuredLessonContent;
  // Signed view URLs for the lesson's images, keyed by storage path.
  imageUrls: Record<string, string>;
  // Admin preview only: show content below unanswered quizzes without answering them.
  showLockedContent?: boolean;
  // Called once every quiz in the lesson has been answered correctly (or straight away when the
  // lesson has none), for the student page to record progress.
  onAllQuizzesPassed?: () => void;
  onQuizAnswer?: (blockIndex: number, questionIndex: number, optionIndex: number) => void;
}

function LessonBlock({
  block,
  index,
  imageUrls,
  onQuizPassed,
  onQuizAnswer,
}: {
  block: StructuredBlock;
  index: number;
  imageUrls: Record<string, string>;
  onQuizPassed: (index: number) => void;
  onQuizAnswer?: (blockIndex: number, questionIndex: number, optionIndex: number) => void;
}) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlock text={block.text} isFirst={index === 0} />;
    case 'text':
      return <TextBlock content={block.content} />;
    case 'steps':
      return <StepsBlock items={block.items} />;
    case 'points':
      return <PointsBlock items={block.items} />;
    case 'table':
      return <TableBlock rows={block.rows} hasHeaderRow={block.hasHeaderRow} />;
    case 'image':
      return <ImageBlock url={imageUrls[block.storagePath]} alt={block.alt} />;
    case 'callout':
      return <CalloutBlock variant={block.variant} content={block.content} />;
    case 'quiz':
      return (
        <QuizBlock
          questions={block.questions}
          onPassed={() => onQuizPassed(index)}
          onAnswer={onQuizAnswer && ((questionIndex, optionIndex) => onQuizAnswer(index, questionIndex, optionIndex))}
        />
      );
  }
}

// One lesson, rendered block by block — the same component the admin preview and the student
// page use. Content after a quiz stays blurred and unreachable until the quiz is answered
// correctly. Remount it (key={lesson.key}) to reset the quiz state when the lesson changes.
export function LessonPlayer({ lesson, imageUrls, showLockedContent = false, onAllQuizzesPassed, onQuizAnswer }: LessonPlayerProps) {
  const [passedQuizIndexes, setPassedQuizIndexes] = useState<ReadonlySet<number>>(() => new Set());

  // Blocks open on first render appear as they are; blocks unlocked later by a quiz fade in.
  const [initiallyOpenCount] = useState(() => getFirstLockedBlockIndex(lesson.blocks, new Set()) ?? lesson.blocks.length);
  const quizCount = useMemo(() => lesson.blocks.filter((block) => block.type === 'quiz').length, [lesson.blocks]);
  const areAllQuizzesPassed = passedQuizIndexes.size === quizCount;

  const handleQuizPassed = useCallback((index: number) => {
    setPassedQuizIndexes((previous) => (previous.has(index) ? previous : new Set(previous).add(index)));
  }, []);

  useEffect(() => {
    if (areAllQuizzesPassed) onAllQuizzesPassed?.();
  }, [areAllQuizzesPassed, onAllQuizzesPassed]);

  const lockedFromIndex = useMemo(
    () => (showLockedContent ? null : getFirstLockedBlockIndex(lesson.blocks, passedQuizIndexes)),
    [lesson.blocks, passedQuizIndexes, showLockedContent],
  );
  const openBlocks = useMemo(
    () => (lockedFromIndex === null ? lesson.blocks : lesson.blocks.slice(0, lockedFromIndex)),
    [lesson.blocks, lockedFromIndex],
  );
  const lockedBlocks = lockedFromIndex === null ? [] : lesson.blocks.slice(lockedFromIndex);

  // Read-aloud: only the open blocks, so nothing locked behind a quiz is read out.
  const speechSegments = useMemo(() => lessonToSpeechSegments(lesson, openBlocks), [lesson, openBlocks]);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const blockElementsRef = useRef(new Map<number, HTMLDivElement>());
  const shouldReduceMotion = useReducedMotion();

  // Brings the block being read into view when it isn't already, so the learner can read along.
  useEffect(() => {
    const element = activeBlockIndex === null ? undefined : blockElementsRef.current.get(activeBlockIndex);
    if (!element) return;
    const { top, bottom } = element.getBoundingClientRect();
    const isOutOfView = top < 100 || (bottom > window.innerHeight - 100 && top > window.innerHeight / 3);
    if (isOutOfView) element.scrollIntoView({ block: top < 100 ? 'start' : 'center', behavior: shouldReduceMotion ? 'auto' : 'smooth' });
  }, [activeBlockIndex, shouldReduceMotion]);

  return (
    // "user": follows the device's reduce-motion setting for every animation inside the player.
    <MotionConfig reducedMotion="user">
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          {lesson.topics && lesson.topics.length > 0 && (
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">{lesson.topics.join(' › ')}</p>
          )}
          <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{lesson.title}</h2>
        </header>
        {lesson.blocks.length === 0 ? (
          <p className="text-slate-500">This lesson has no content yet.</p>
        ) : (
          <LessonAudioPlayer segments={speechSegments} hasLockedContent={lockedBlocks.length > 0} onActiveBlockChange={setActiveBlockIndex} />
        )}

        {openBlocks.map((block, index) => (
          <motion.div
            key={index}
            ref={(element: HTMLDivElement | null) => {
              if (element) blockElementsRef.current.set(index, element);
              else blockElementsRef.current.delete(index);
            }}
            initial={index >= initiallyOpenCount ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            // The block being read aloud gets a soft gold highlight; the ring adds room around it
            // without shifting the layout.
            className={`scroll-mt-28 rounded-sm transition-colors duration-300 ${index === activeBlockIndex ? 'bg-gold-500/15 ring-8 ring-gold-500/15' : 'ring-0'}`}
          >
            <LessonBlock block={block} index={index} imageUrls={imageUrls} onQuizPassed={handleQuizPassed} onQuizAnswer={onQuizAnswer} />
          </motion.div>
        ))}

        {lockedBlocks.length > 0 && (
          <div className="relative">
            {/* Only a short, blurred glimpse is rendered, and it can't be focused or read aloud. */}
            <div aria-hidden inert className="pointer-events-none max-h-64 select-none overflow-hidden blur-[6px]">
              <div className="flex flex-col gap-6">
                {lockedBlocks.slice(0, 3).map((block, offset) => (
                  <LessonBlock key={offset} block={block} index={lockedFromIndex! + offset} imageUrls={imageUrls} onQuizPassed={() => {}} />
                ))}
              </div>
            </div>
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-white/30 via-white/80 to-white pb-6">
              <p className="flex items-center gap-2 rounded-full bg-navy-900 px-4 py-2 text-sm font-medium text-white shadow">
                <Icon name="lock" className="h-4 w-4" />
                Answer the question above to keep reading
              </p>
            </div>
          </div>
        )}
      </article>
    </MotionConfig>
  );
}
