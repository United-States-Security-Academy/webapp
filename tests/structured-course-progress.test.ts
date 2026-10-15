import { describe, expect, it } from 'vitest';
import type { StructuredBlock } from '@/db/schema/structured-courses';
import {
  buildStructuredLessonHref,
  checkQuizAnswers,
  computeStructuredCourseProgress,
  findContinueLesson,
  findLessonPosition,
  type StructuredOutlineModule,
} from '@/features/structured-courses/structured-course-progress';

const MONDAY = new Date('2026-10-12T10:00:00Z');
const TUESDAY = new Date('2026-10-13T10:00:00Z');

function outline(completed: Record<string, Date>): StructuredOutlineModule[] {
  const lesson = (moduleId: string, lessonKey: string) => ({ moduleId, lessonKey, title: lessonKey, completedAt: completed[lessonKey] ?? null });
  return [
    { moduleId: 'm1', title: 'Patrol', lessons: [lesson('m1', 'intro'), lesson('m1', 'procedures')] },
    { moduleId: 'm2', title: 'Access', lessons: [lesson('m2', 'intro-2'), lesson('m2', 'passes')] },
  ];
}

describe('computeStructuredCourseProgress', () => {
  it('counts completed lessons across modules', () => {
    expect(computeStructuredCourseProgress(outline({ intro: MONDAY }))).toEqual({ totalLessons: 4, completedLessons: 1, completedAt: null });
  });

  it('is complete, at the last completion time, once every lesson is done', () => {
    const progress = computeStructuredCourseProgress(outline({ intro: MONDAY, procedures: TUESDAY, 'intro-2': MONDAY, passes: MONDAY }));
    expect(progress).toEqual({ totalLessons: 4, completedLessons: 4, completedAt: TUESDAY });
  });

  it('is never complete with no published lessons', () => {
    expect(computeStructuredCourseProgress([])).toEqual({ totalLessons: 0, completedLessons: 0, completedAt: null });
  });
});

describe('findContinueLesson', () => {
  it('picks the first lesson not completed yet, even when a later one is', () => {
    expect(findContinueLesson(outline({ intro: MONDAY, passes: MONDAY }))?.lessonKey).toBe('procedures');
  });

  it('goes back to the first lesson when everything is complete, and is null for an empty course', () => {
    expect(findContinueLesson(outline({ intro: MONDAY, procedures: MONDAY, 'intro-2': MONDAY, passes: MONDAY }))?.lessonKey).toBe('intro');
    expect(findContinueLesson([])).toBeNull();
  });
});

describe('findLessonPosition', () => {
  it('numbers lessons across the course and links across module boundaries', () => {
    const position = findLessonPosition(outline({}), 'm2', 'intro-2');
    expect(position).toMatchObject({ number: 3, total: 4, previous: { lessonKey: 'procedures' }, next: { lessonKey: 'passes' } });
  });

  it('has no previous lesson at the start or next at the end, and is null for an unknown lesson', () => {
    expect(findLessonPosition(outline({}), 'm1', 'intro')?.previous).toBeNull();
    expect(findLessonPosition(outline({}), 'm2', 'passes')?.next).toBeNull();
    expect(findLessonPosition(outline({}), 'm1', 'passes')).toBeNull();
  });
});

describe('buildStructuredLessonHref', () => {
  it('builds the student lesson URL', () => {
    expect(buildStructuredLessonHref('/dashboard/courses', 'patrol-101', { moduleId: 'm1', lessonKey: 'intro' })).toBe(
      '/dashboard/courses/patrol-101/learn/m1/intro',
    );
  });
});

describe('checkQuizAnswers', () => {
  const blocks: StructuredBlock[] = [
    { type: 'text', content: [{ text: 'Read this' }] },
    {
      type: 'quiz',
      questions: [
        { prompt: 'One?', options: ['a', 'b', 'c'], correctIndex: 2 },
        { prompt: 'Two?', options: ['a', 'b'], correctIndex: 0 },
      ],
    },
  ];

  it('accepts answers that end on the correct option, keeping wrong tries before it', () => {
    const result = checkQuizAnswers(blocks, [
      { blockIndex: 1, questionIndex: 0, selectedOptionIndexes: [0, 2] },
      { blockIndex: 1, questionIndex: 1, selectedOptionIndexes: [0] },
    ]);
    expect(result).toEqual({
      success: true,
      answers: [
        { blockIndex: 1, questionIndex: 0, selectedOptionIndexes: [0, 2] },
        { blockIndex: 1, questionIndex: 1, selectedOptionIndexes: [0] },
      ],
    });
  });

  it('rejects a missing or wrong answer', () => {
    expect(checkQuizAnswers(blocks, [{ blockIndex: 1, questionIndex: 0, selectedOptionIndexes: [2] }])).toMatchObject({ success: false });
    expect(
      checkQuizAnswers(blocks, [
        { blockIndex: 1, questionIndex: 0, selectedOptionIndexes: [2] },
        { blockIndex: 1, questionIndex: 1, selectedOptionIndexes: [1] },
      ]),
    ).toMatchObject({ success: false });
  });

  it('drops anything unexpected the browser sends', () => {
    const result = checkQuizAnswers(blocks, [
      { blockIndex: 1, questionIndex: 0, selectedOptionIndexes: [9, -1, 'x', 0, 0, 2], extra: 'field' },
      { blockIndex: 1, questionIndex: 1, selectedOptionIndexes: [0] },
      { blockIndex: 7, questionIndex: 0, selectedOptionIndexes: [1] },
    ]);
    expect(result).toEqual({
      success: true,
      answers: [
        { blockIndex: 1, questionIndex: 0, selectedOptionIndexes: [0, 2] },
        { blockIndex: 1, questionIndex: 1, selectedOptionIndexes: [0] },
      ],
    });
  });

  it('needs no answers for a lesson without a quiz, and copes with junk input', () => {
    expect(checkQuizAnswers([{ type: 'text', content: [{ text: 'x' }] }], 'nonsense')).toEqual({ success: true, answers: [] });
    expect(checkQuizAnswers(blocks, null)).toMatchObject({ success: false });
  });
});
