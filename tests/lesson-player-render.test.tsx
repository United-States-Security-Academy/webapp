import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseStructuredModule } from '@/features/structured-courses/parse-structured-module';
import { LessonPlayer } from '@/features/structured-courses/player/lesson-player';

// Renders the real lesson player (as the server does on first load) for the sample module, to
// check every block type renders and the quiz lock behaves.

async function sampleLessons() {
  const docx = readFileSync(join(__dirname, 'fixtures', 'sample-module.docx'));
  const result = await parseStructuredModule('sample-module.docx', docx, async (_bytes, _type, imageNumber) => `m/r/image-${imageNumber}.png`);
  return result.lessons;
}

describe('LessonPlayer', () => {
  it('renders every block type of a lesson', async () => {
    const [lesson] = await sampleLessons();
    const html = renderToStaticMarkup(
      createElement(LessonPlayer, { lesson: lesson!, imageUrls: { 'm/r/image-1.png': 'https://example.test/badge.png' }, showLockedContent: true }),
    );

    expect(html).toContain('Patrol procedures');
    expect(html).toContain('<h3');
    expect(html).toContain('<strong');
    expect(html).toContain('Step 1: </span>Turn the radio on');
    expect(html).toContain('Flashlight');
    expect(html).toContain('Note</p>');
    expect(html).toContain('Warning</p>');
    expect(html).toContain('<th scope="col"');
    expect(html).toContain('src="https://example.test/badge.png"');
    expect(html).toContain('What do you check first?');
    expect(html).not.toContain('keep reading');
    expect(html).toContain('Listen to this lesson');
  });

  it('keeps the content below an unanswered quiz locked, hidden from screen readers', async () => {
    const lessons = await sampleLessons();
    // A lesson whose quiz is followed by more content.
    const lesson = { ...lessons[0]!, blocks: [...lessons[0]!.blocks, ...lessons[1]!.blocks] };
    const html = renderToStaticMarkup(createElement(LessonPlayer, { lesson, imageUrls: {} }));

    expect(html).toContain('Answer the question above to keep reading');
    expect(html).toMatch(/aria-hidden="true" inert=""[^>]*blur/);
    expect(html).toContain('This picture couldn&#x27;t be loaded.');
  });

  it('renders a lesson without a quiz fully open', async () => {
    const [, lesson] = await sampleLessons();
    const html = renderToStaticMarkup(createElement(LessonPlayer, { lesson: lesson!, imageUrls: {} }));
    expect(html).toContain('Only let in visitors with a valid pass.');
    expect(html).not.toContain('keep reading');
  });
});
