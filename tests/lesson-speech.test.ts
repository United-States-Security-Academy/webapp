import { describe, expect, it } from 'vitest';
import type { StructuredBlock } from '@/db/schema/structured-courses';
import { lessonToSpeechSegments } from '@/features/structured-courses/player/lesson-speech';

const lesson = { title: 'Patrol procedures' };

function speak(blocks: StructuredBlock[]) {
  return lessonToSpeechSegments(lesson, blocks);
}

describe('lessonToSpeechSegments', () => {
  it('reads the title, then each block in order, tagged with its block index', () => {
    const segments = speak([
      { type: 'heading', text: 'Before you start' },
      { type: 'text', content: [{ text: 'Check your ' }, { text: 'radio', bold: true }, { text: ' first' }] },
    ]);
    expect(segments).toEqual([
      { blockIndex: null, text: 'Patrol procedures.' },
      { blockIndex: 0, text: 'Before you start.' },
      { blockIndex: 1, text: 'Check your radio first.' },
    ]);
  });

  it('numbers steps, pauses between points and labels callouts and pictures', () => {
    const segments = speak([
      { type: 'steps', items: [[{ text: 'Turn the radio on' }], [{ text: 'Call control' }]] },
      { type: 'points', items: [[{ text: 'Flashlight' }], [{ text: 'Notebook!' }]] },
      { type: 'callout', variant: 'warning', content: [{ text: 'Never patrol alone' }] },
      { type: 'image', storagePath: 'm/r/image-1.png', alt: 'A security badge' },
      { type: 'image', storagePath: 'm/r/image-2.png', alt: '' },
    ]);
    expect(segments.slice(1).map((segment) => segment.text)).toEqual([
      'Step 1: Turn the radio on. Step 2: Call control.',
      'Flashlight. Notebook!',
      'Warning: Never patrol alone.',
      'Picture: A security badge.',
    ]);
  });

  it('reads each table cell with its column heading', () => {
    const [, segment] = speak([
      {
        type: 'table',
        hasHeaderRow: true,
        rows: [
          [[{ text: 'Item' }], [{ text: 'Check' }]],
          [[{ text: 'Flashlight' }], [{ text: 'Batteries' }]],
        ],
      },
    ]);
    expect(segment!.text).toBe('Table. Item: Flashlight, Check: Batteries.');
  });

  it('reads a quiz question and its options without giving the answer away', () => {
    const [, segment] = speak([
      {
        type: 'quiz',
        questions: [{ prompt: 'What do you check first?', options: ['Radio', 'Shoes'], correctIndex: 0, explanation: 'SECRET' }],
      },
    ]);
    expect(segment!.text).toBe('Practice question. What do you check first? A: Radio. B: Shoes. Choose your answer on the screen.');
    expect(segment!.text).not.toContain('SECRET');
    expect(segment!.text).not.toMatch(/correct/i);
  });

  it('splits a long block between sentences', () => {
    const sentence = 'Officers must record every visitor at the gate. ';
    const segments = speak([{ type: 'text', content: [{ text: sentence.repeat(30) }] }]).slice(1);
    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments) {
      expect(segment.blockIndex).toBe(0);
      expect(segment.text.length).toBeLessThanOrEqual(300);
      expect(segment.text).toMatch(/^Officers.*gate\.$/);
    }
    expect(segments.map((segment) => segment.text).join(' ')).toBe(sentence.repeat(30).trim());
  });

  it('splits a very long sentence between words', () => {
    const segments = speak([{ type: 'text', content: [{ text: 'word '.repeat(200) }] }]).slice(1);
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.every((segment) => segment.text.length <= 300 && !segment.text.includes('wor '))).toBe(true);
  });
});
