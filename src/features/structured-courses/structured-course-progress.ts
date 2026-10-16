import type { StructuredBlock, StructuredQuizAnswer } from '@/db/schema/structured-courses';

// Pure helpers for a student's way through a structured course: what's complete, where to carry
// on, and the lessons either side of the current one. The outline only ever holds published
// modules, in course order.

export interface StructuredOutlineLesson {
  moduleId: string;
  lessonKey: string;
  title: string;
  completedAt: Date | null;
}

export interface StructuredOutlineModule {
  moduleId: string;
  title: string;
  lessons: StructuredOutlineLesson[];
}

// Same shape as the PDF course progress, so the exam, certificate and dashboard logic built on it
// works for both formats.
export interface StructuredCourseProgress {
  totalLessons: number;
  completedLessons: number;
  // When the last lesson was completed, once every lesson is; otherwise null.
  completedAt: Date | null;
}

export function buildStructuredLessonHref(basePath: string, courseSlug: string, lesson: Pick<StructuredOutlineLesson, 'moduleId' | 'lessonKey'>): string {
  return `${basePath}/${courseSlug}/learn/${lesson.moduleId}/${encodeURIComponent(lesson.lessonKey)}`;
}

export function listOutlineLessons(outline: StructuredOutlineModule[]): StructuredOutlineLesson[] {
  return outline.flatMap((outlineModule) => outlineModule.lessons);
}

export function computeStructuredCourseProgress(outline: StructuredOutlineModule[]): StructuredCourseProgress {
  const lessons = listOutlineLessons(outline);
  const completedTimes = lessons.flatMap((lesson) => (lesson.completedAt ? [lesson.completedAt] : []));
  const isComplete = lessons.length > 0 && completedTimes.length === lessons.length;
  return {
    totalLessons: lessons.length,
    completedLessons: completedTimes.length,
    completedAt: isComplete ? completedTimes.reduce((latest, time) => (time > latest ? time : latest)) : null,
  };
}

// "Continue where you left off": the first lesson not yet completed, in course order; the first
// lesson when everything is done (to review), or null for a course with no published lessons.
export function findContinueLesson(outline: StructuredOutlineModule[]): StructuredOutlineLesson | null {
  const lessons = listOutlineLessons(outline);
  return lessons.find((lesson) => !lesson.completedAt) ?? lessons[0] ?? null;
}

export interface LessonPosition {
  lesson: StructuredOutlineLesson;
  // 1-based, across the whole course.
  number: number;
  total: number;
  previous: StructuredOutlineLesson | null;
  next: StructuredOutlineLesson | null;
}

export function findLessonPosition(outline: StructuredOutlineModule[], moduleId: string, lessonKey: string): LessonPosition | null {
  const lessons = listOutlineLessons(outline);
  const index = lessons.findIndex((lesson) => lesson.moduleId === moduleId && lesson.lessonKey === lessonKey);
  const lesson = lessons[index];
  if (!lesson) return null;
  return { lesson, number: index + 1, total: lessons.length, previous: lessons[index - 1] ?? null, next: lessons[index + 1] ?? null };
}

export type QuizAnswersCheck = { success: true; answers: StructuredQuizAnswer[] } | { success: false; error: string };

// Server-side check before a lesson is saved as complete: every inline quiz question in the lesson
// must have answers, ending with the correct option. Only the expected questions are kept, and
// each answer list is trimmed to valid, distinct options, so nothing odd from the browser is stored.
export function checkQuizAnswers(blocks: StructuredBlock[], submittedAnswers: unknown): QuizAnswersCheck {
  const submitted = Array.isArray(submittedAnswers) ? submittedAnswers : [];
  const answers: StructuredQuizAnswer[] = [];

  for (const [blockIndex, block] of blocks.entries()) {
    if (block.type !== 'quiz') continue;
    for (const [questionIndex, question] of block.questions.entries()) {
      const match = submitted.find(
        (answer): answer is { selectedOptionIndexes: unknown } =>
          typeof answer === 'object' && answer !== null && answer.blockIndex === blockIndex && answer.questionIndex === questionIndex,
      );
      const picked = Array.isArray(match?.selectedOptionIndexes) ? match.selectedOptionIndexes : [];
      const selectedOptionIndexes = [
        ...new Set(picked.filter((option): option is number => Number.isInteger(option) && option >= 0 && option < question.options.length)),
      ];
      if (selectedOptionIndexes[selectedOptionIndexes.length - 1] !== question.correctIndex) {
        return { success: false, error: 'Answer every question in this lesson correctly to complete it.' };
      }
      answers.push({ blockIndex, questionIndex, selectedOptionIndexes });
    }
  }
  return { success: true, answers };
}
