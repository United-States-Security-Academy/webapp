import { describe, expect, it } from 'vitest';
import type { StructuredBlock } from '@/db/schema/structured-courses';
import { LONG_LESSON_WORDS, countLessonWords, reviewModuleContent } from '@/features/structured-courses/review-module-content';
import { getFirstLockedBlockIndex } from '@/features/structured-courses/player/lesson-gate';

const text = (words: number): StructuredBlock => ({ type: 'text', content: [{ text: Array.from({ length: words }, () => 'word').join(' ') }] });
const quiz: StructuredBlock = { type: 'quiz', questions: [{ prompt: 'Ready?', options: ['Yes', 'No'], correctIndex: 0 }] };

describe('reviewModuleContent', () => {
  it('has nothing to say about a normal lesson', () => {
    expect(reviewModuleContent({ title: 'M', lessons: [{ key: 'a', title: 'A', blocks: [text(300)] }] })).toEqual([]);
  });

  it('warns about empty and very long lessons', () => {
    const warnings = reviewModuleContent({
      title: 'M',
      lessons: [
        { key: 'empty', title: 'Empty', blocks: [] },
        { key: 'long', title: 'Long', blocks: [text(LONG_LESSON_WORDS + 400)] },
      ],
    });
    expect(warnings).toEqual([
      "Lesson 'Empty' has no content under its heading.",
      "Lesson 'Long' is very long (about 2000 words, roughly 10 minutes to read). Consider splitting it into two lessons.",
    ]);
  });

  it('warns about wide tables and pictures without a description', () => {
    const warnings = reviewModuleContent({
      title: 'M',
      lessons: [
        {
          key: 'a',
          title: 'A',
          blocks: [
            { type: 'table', hasHeaderRow: true, rows: [Array.from({ length: 7 }, () => [{ text: 'x' }])] },
            { type: 'image', storagePath: 'p.png', alt: '' },
            { type: 'image', storagePath: 'q.png', alt: 'Badge' },
          ],
        },
      ],
    });
    expect(warnings).toEqual([
      expect.stringContaining("Lesson 'A' has a table with 7 columns"),
      expect.stringContaining("Lesson 'A' has a picture with no description"),
    ]);
  });

  it('counts words in every kind of block', () => {
    expect(
      countLessonWords([
        { type: 'heading', text: 'Two words' },
        { type: 'steps', items: [[{ text: 'one' }], [{ text: 'two three' }]] },
        { type: 'quiz', questions: [{ prompt: 'Ready now?', options: ['Yes', 'No'], correctIndex: 0, explanation: 'Because.' }] },
      ]),
    ).toBe(10);
  });
});

describe('getFirstLockedBlockIndex', () => {
  const blocks = [text(1), quiz, text(1), quiz, text(1)];

  it('locks everything after the first unanswered quiz', () => {
    expect(getFirstLockedBlockIndex(blocks, new Set())).toBe(2);
  });

  it('moves the lock down as each quiz is passed', () => {
    expect(getFirstLockedBlockIndex(blocks, new Set([1]))).toBe(4);
    expect(getFirstLockedBlockIndex(blocks, new Set([1, 3]))).toBeNull();
  });

  it('locks nothing in a lesson without a quiz, or when the quiz is the last block', () => {
    expect(getFirstLockedBlockIndex([text(1), text(1)], new Set())).toBeNull();
    expect(getFirstLockedBlockIndex([text(1), quiz], new Set())).toBeNull();
  });
});
