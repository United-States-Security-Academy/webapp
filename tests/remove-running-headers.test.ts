import { describe, expect, it } from 'vitest';
import { removeRunningHeadersAndFooters, type PositionedLine } from '@/features/pdf/remove-running-headers';

const header = (text: string): PositionedLine => ({ text, verticalPosition: 0.04 });
const body = (text: string): PositionedLine => ({ text, verticalPosition: 0.5 });
const footer = (text: string): PositionedLine => ({ text, verticalPosition: 0.96 });

describe('removeRunningHeadersAndFooters', () => {
  it('drops a footer that repeats on every page, even when its page number changes', () => {
    const pages = [1, 2, 3].map((pageNumber) => [
      body(`Lesson content ${pageNumber}.`),
      footer(`© 2026 United States Security Academy · Page ${pageNumber} of 3`),
    ]);
    expect(removeRunningHeadersAndFooters(pages)).toEqual(['Lesson content 1.', 'Lesson content 2.', 'Lesson content 3.']);
  });

  it('drops a repeated header', () => {
    const pages = [1, 2, 3].map((pageNumber) => [header('Level II Student Guide'), body(`Section ${pageNumber}`)]);
    expect(removeRunningHeadersAndFooters(pages)).toEqual(['Section 1', 'Section 2', 'Section 3']);
  });

  it('drops bare page numbers, even on a single-page document', () => {
    expect(removeRunningHeadersAndFooters([[body('Only page.'), footer('1')]])).toEqual(['Only page.']);
    expect(removeRunningHeadersAndFooters([[body('Intro.'), footer('- 4 -')]])).toEqual(['Intro.']);
    expect(removeRunningHeadersAndFooters([[body('Preface.'), footer('iv')]])).toEqual(['Preface.']);
  });

  it('keeps a one-off line near the bottom of a page', () => {
    const pages = [
      [body('First page body.'), footer('This sentence finishes the paragraph.')],
      [body('Second page body.'), footer('Page 2')],
      [body('Third page body.'), footer('Page 3')],
    ];
    expect(removeRunningHeadersAndFooters(pages)[0]).toBe('First page body. This sentence finishes the paragraph.');
  });

  it('never drops repeated text in the middle of the page', () => {
    const pages = [1, 2, 3].map(() => [body('Remember: safety first.')]);
    expect(removeRunningHeadersAndFooters(pages)).toEqual(['Remember: safety first.', 'Remember: safety first.', 'Remember: safety first.']);
  });
});
