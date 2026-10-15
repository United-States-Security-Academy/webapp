'use client';

import { useRef, useState } from 'react';
import type { StructuredModuleContent } from '@/db/schema/structured-courses';
import { Button } from '@/components/ui/button';
import { LessonPlayer } from './player/lesson-player';

// The admin preview of a module: the student lesson player, one lesson at a time, with lesson
// navigation. "Show locked content" lets the admin read past quizzes without answering them;
// students never get that option.
export function ModulePreview({ content, imageUrls }: { content: StructuredModuleContent; imageUrls: Record<string, string> }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [showLockedContent, setShowLockedContent] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const lesson = content.lessons[lessonIndex];

  function goToLesson(index: number) {
    setLessonIndex(index);
    topRef.current?.scrollIntoView({ block: 'start' });
  }

  if (!lesson) return null;

  return (
    <div ref={topRef} className="scroll-mt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <span className="font-medium">Lesson</span>
          <select
            value={lessonIndex}
            onChange={(changeEvent) => goToLesson(Number(changeEvent.target.value))}
            className="min-w-0 max-w-full flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-navy-800 focus:outline-none"
          >
            {content.lessons.map((lessonOption, index) => (
              <option key={lessonOption.key} value={index}>
                {index + 1}. {lessonOption.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showLockedContent}
            onChange={(changeEvent) => setShowLockedContent(changeEvent.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Show content locked behind quizzes (preview only)
        </label>
      </div>

      {/* Same width and padding a student gets on a phone, widening on larger screens. */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-6 sm:px-8 sm:py-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          {content.title} · Lesson {lessonIndex + 1} of {content.lessons.length}
        </p>
        <LessonPlayer key={lesson.key} lesson={lesson} imageUrls={imageUrls} showLockedContent={showLockedContent} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => goToLesson(lessonIndex - 1)} disabled={lessonIndex === 0}>
          Previous lesson
        </Button>
        <Button variant="outline" onClick={() => goToLesson(lessonIndex + 1)} disabled={lessonIndex === content.lessons.length - 1}>
          Next lesson
        </Button>
      </div>
    </div>
  );
}
