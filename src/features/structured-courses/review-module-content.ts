import type { StructuredBlock, StructuredInline, StructuredModuleContent } from '@/db/schema/structured-courses';

// Checks shown above the admin preview: things that convert fine but make a weaker lesson for
// students. They never block publishing.

const WORDS_PER_MINUTE = 200;
// About 8 minutes of reading; longer lessons are hard to finish in one sitting on a phone.
export const LONG_LESSON_WORDS = 1600;
// More columns than this need a lot of sideways scrolling on a phone.
export const WIDE_TABLE_COLUMNS = 5;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function runsText(runs: StructuredInline[]): string {
  return runs.map((run) => run.text).join('');
}

function blockText(block: StructuredBlock): string {
  switch (block.type) {
    case 'heading':
      return block.text;
    case 'text':
    case 'callout':
      return runsText(block.content);
    case 'steps':
    case 'points':
      return block.items.map(runsText).join(' ');
    case 'table':
      return block.rows.flatMap((row) => row.map(runsText)).join(' ');
    case 'quiz':
      return block.questions.map((question) => [question.prompt, ...question.options, question.explanation ?? ''].join(' ')).join(' ');
    case 'image':
      return '';
  }
}

export function countLessonWords(blocks: StructuredBlock[]): number {
  return blocks.reduce((total, block) => total + countWords(blockText(block)), 0);
}

export function reviewModuleContent(content: StructuredModuleContent): string[] {
  const warnings: string[] = [];
  for (const lesson of content.lessons) {
    const location = `Lesson '${lesson.title}'`;
    if (lesson.blocks.length === 0) {
      warnings.push(`${location} has no content under its heading.`);
      continue;
    }

    const words = countLessonWords(lesson.blocks);
    if (words > LONG_LESSON_WORDS) {
      const minutes = Math.round(words / WORDS_PER_MINUTE);
      warnings.push(`${location} is very long (about ${words} words, roughly ${minutes} minutes to read). Consider splitting it into two lessons.`);
    }

    const widestTable = Math.max(0, ...lesson.blocks.map((block) => (block.type === 'table' ? Math.max(0, ...block.rows.map((row) => row.length)) : 0)));
    if (widestTable > WIDE_TABLE_COLUMNS) {
      warnings.push(`${location} has a table with ${widestTable} columns. On phones, students will need to scroll sideways to read it.`);
    }

    const imagesWithoutAlt = lesson.blocks.filter((block) => block.type === 'image' && !block.alt.trim()).length;
    if (imagesWithoutAlt > 0) {
      warnings.push(
        `${location} has ${imagesWithoutAlt === 1 ? 'a picture' : `${imagesWithoutAlt} pictures`} with no description. ` +
          'In Word, right-click the picture, choose View Alt Text, and describe it for students who use screen readers.',
      );
    }
  }
  return warnings;
}
