import { load, type CheerioAPI } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import type { StructuredBlock, StructuredInline, StructuredLessonContent } from '@/db/schema/structured-courses';
import { slugify } from '@/slugify';
import { parseQuizBlock, type QuizLine } from './parse-quiz-block';

// `errors` are problems the admin must fix in Word before the module can be used; `warnings` are
// things the parser worked around. When there are errors, `module` and `lessons` hold whatever
// could be read, for context only — they are never saved.
export interface ModuleContentResult {
  module: { title: string } | null;
  lessons: StructuredLessonContent[];
  errors: string[];
  warnings: string[];
}

const QUIZ_START = '[QUIZ]';
const QUIZ_END = '[/QUIZ]';
const CALLOUT_PATTERN = /^(note|warning)\s*:\s*/i;
const SAFE_HREF_PATTERN = /^(https?:|mailto:)/i;

function isElement(node: AnyNode): node is Element {
  return node.type === 'tag';
}

function childElements(node: Element, tagNames: string[]): Element[] {
  return node.children.filter((child): child is Element => isElement(child) && tagNames.includes(child.name));
}

function sameFormatting(a: StructuredInline, b: StructuredInline): boolean {
  return !!a.bold === !!b.bold && !!a.italic === !!b.italic && a.href === b.href;
}

// Text runs inside one element, keeping bold, italic and safe links. Nested lists are left out
// (they are read separately as their own list items).
function readInline(node: AnyNode, formatting: Omit<StructuredInline, 'text'> = {}): StructuredInline[] {
  if (node.type === 'text') return node.data ? [{ text: node.data, ...formatting }] : [];
  if (!isElement(node)) return [];

  switch (node.name) {
    case 'br':
      return [{ text: '\n', ...formatting }];
    case 'ol':
    case 'ul':
    case 'img':
      return [];
  }

  const childFormatting = { ...formatting };
  if (node.name === 'strong' || node.name === 'b') childFormatting.bold = true;
  if (node.name === 'em' || node.name === 'i') childFormatting.italic = true;
  if (node.name === 'a' && node.attribs.href && SAFE_HREF_PATTERN.test(node.attribs.href)) childFormatting.href = node.attribs.href;

  const runs = node.children.flatMap((child) => readInline(child, childFormatting));
  // Paragraphs inside a table cell or list item each end a line.
  if (node.name === 'p' && runs.length > 0) runs.push({ text: '\n', ...formatting });
  return runs;
}

// Merges neighbouring runs with the same formatting and trims the whole run's outer whitespace.
function tidyInline(runs: StructuredInline[]): StructuredInline[] {
  const merged: StructuredInline[] = [];
  for (const run of runs) {
    const previous = merged[merged.length - 1];
    if (previous && sameFormatting(previous, run)) previous.text += run.text;
    else merged.push({ ...run });
  }
  const first = merged[0];
  if (first) first.text = first.text.replace(/^\s+/, '');
  const last = merged[merged.length - 1];
  if (last) last.text = last.text.replace(/\s+$/, '');
  return merged.filter((run) => run.text.length > 0);
}

function inlineOf(node: Element): StructuredInline[] {
  return tidyInline(node.children.flatMap((child) => readInline(child)));
}

function plainText(runs: StructuredInline[]): string {
  return runs.map((run) => run.text).join('');
}

// Removes a "Note:" / "Warning:" prefix from the start of a run list, wherever the prefix's
// characters fall across bold/plain runs.
function stripPrefix(runs: StructuredInline[], prefixLength: number): StructuredInline[] {
  let remaining = prefixLength;
  const result: StructuredInline[] = [];
  for (const run of runs) {
    if (remaining >= run.text.length) {
      remaining -= run.text.length;
      continue;
    }
    result.push({ ...run, text: run.text.slice(remaining) });
    remaining = 0;
  }
  return tidyInline(result);
}

// List items, flattening nested lists into the same list (with a warning) — the block model has
// one level of steps or points.
function readListItems(list: Element, warnings: string[], location: string): StructuredInline[][] {
  const items: StructuredInline[][] = [];
  for (const item of childElements(list, ['li'])) {
    const runs = inlineOf(item);
    if (runs.length > 0) items.push(runs);
    const nestedLists = childElements(item, ['ol', 'ul']);
    if (nestedLists.length > 0) {
      warnings.push(`${location}: a list inside a list was flattened into one level.`);
      for (const nestedList of nestedLists) items.push(...readListItems(nestedList, warnings, location));
    }
  }
  return items;
}

function readTable($: CheerioAPI, table: Element): StructuredBlock | null {
  const rowElements = $(table).find('tr').toArray();
  const rows = rowElements.map((row) => childElements(row, ['td', 'th']).map((cell) => inlineOf(cell)));
  if (rows.length === 0) return null;
  const firstRow = rowElements[0];
  const hasHeaderRow = !!firstRow && childElements(firstRow, ['th']).length > 0;
  return { type: 'table', rows, hasHeaderRow };
}

// Each line of a paragraph (Shift+Enter line breaks split one paragraph into several lines).
function linesOf(runs: StructuredInline[]): string[] {
  return plainText(runs)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function quote(text: string): string {
  return text.length > 60 ? `"${text.slice(0, 60)}..."` : `"${text}"`;
}

function lessonLocation(lesson: StructuredLessonContent): string {
  return `Lesson '${lesson.title}'`;
}

export function htmlToModuleContent(html: string): ModuleContentResult {
  const $ = load(html, null, false);
  const errors: string[] = [];
  const warnings: string[] = [];

  let moduleTitle: string | null = null;
  const lessons: StructuredLessonContent[] = [];
  let currentLesson: StructuredLessonContent | null = null;
  // Quiz questions so far in the current lesson, for numbering in error messages.
  let lessonQuestionCount = 0;
  // Typed with `as` so TypeScript doesn't narrow it to null: the helpers below reassign it.
  let quizLines = null as QuizLine[] | null;
  let hasReportedContentBeforeLesson = false;

  function location(): string {
    return currentLesson ? lessonLocation(currentLesson) : 'The module';
  }

  // Everything except Heading 1 and 2 belongs to a lesson; content above the first Heading 2
  // would have nowhere to be shown.
  function addBlock(block: StructuredBlock, preview: string) {
    if (!currentLesson) {
      if (!hasReportedContentBeforeLesson) {
        errors.push(`Text appears before the first Heading 2 (${quote(preview)}). Add a lesson heading above it.`);
        hasReportedContentBeforeLesson = true;
      }
      return;
    }
    currentLesson.blocks.push(block);
  }

  function reportUnclosedQuiz() {
    errors.push(`[QUIZ] in ${currentLesson ? `lesson '${currentLesson.title}'` : 'the module'} has no closing [/QUIZ].`);
    quizLines = null;
  }

  function closeQuiz(lines: QuizLine[]) {
    quizLines = null;
    const result = parseQuizBlock(lines, { location: location(), firstQuestionNumber: lessonQuestionCount + 1 });
    lessonQuestionCount += result.questionCount;
    errors.push(...result.errors);
    if (result.errors.length === 0) addBlock({ type: 'quiz', questions: result.questions }, '[QUIZ]');
  }

  // A paragraph that opens, closes or sits inside a quiz is read line by line.
  function readQuizParagraph(runs: StructuredInline[]) {
    const leftoverLines: string[] = [];
    for (const line of linesOf(runs)) {
      const marker = line.toUpperCase();
      if (marker === QUIZ_START) {
        if (quizLines) reportUnclosedQuiz();
        quizLines = [];
      } else if (marker === QUIZ_END) {
        if (quizLines) closeQuiz(quizLines);
        else errors.push(`${location()} has a [/QUIZ] with no [QUIZ] before it.`);
      } else if (quizLines) {
        quizLines.push({ text: line, isListItem: false });
      } else {
        leftoverLines.push(line);
      }
    }
    // Text written before [QUIZ] or after [/QUIZ] in the same paragraph.
    if (leftoverLines.length > 0) {
      const text = leftoverLines.join('\n');
      addBlock({ type: 'text', content: [{ text }] }, text);
    }
  }

  for (const node of $.root().children().toArray()) {
    if (!isElement(node)) continue;

    if (node.name === 'p') {
      const runs = inlineOf(node);
      const images = $(node).find('img').toArray();
      const hasQuizMarker = linesOf(runs).some((line) => line.toUpperCase() === QUIZ_START || line.toUpperCase() === QUIZ_END);

      if ((quizLines && images.length === 0) || hasQuizMarker) {
        readQuizParagraph(runs);
        continue;
      }
      // An image can't be part of a quiz, so the quiz above it was never closed.
      if (quizLines) reportUnclosedQuiz();

      // mammoth puts each image inside a paragraph.
      for (const image of images) {
        const storagePath = image.attribs.src;
        if (storagePath) addBlock({ type: 'image', storagePath, alt: image.attribs.alt ?? '' }, 'an image');
      }

      const text = plainText(runs);
      if (!text) continue;

      const calloutMatch = CALLOUT_PATTERN.exec(text);
      if (calloutMatch) {
        const content = stripPrefix(runs, calloutMatch[0].length);
        if (content.length > 0) {
          addBlock({ type: 'callout', variant: calloutMatch[1]!.toLowerCase() as 'note' | 'warning', content }, text);
          continue;
        }
      }

      addBlock({ type: 'text', content: runs }, text);
      continue;
    }

    // Inside [QUIZ] ... [/QUIZ], list items are answer options (Word's automatic A), B), C) list).
    if (quizLines && (node.name === 'ol' || node.name === 'ul')) {
      for (const item of readListItems(node, warnings, location())) quizLines.push({ text: plainText(item), isListItem: true });
      continue;
    }

    // A heading or table ends an open quiz: its [/QUIZ] is missing.
    if (quizLines) reportUnclosedQuiz();

    switch (node.name) {
      case 'h1': {
        const title = plainText(inlineOf(node)).trim();
        if (!title) break;
        if (moduleTitle === null) {
          moduleTitle = title;
        } else {
          errors.push(
            `More than one Heading 1 found ('${moduleTitle}' and '${title}'). ` +
              'Each file is one module, so use Heading 1 only once, for the module title.',
          );
        }
        break;
      }
      case 'h2': {
        const title = plainText(inlineOf(node)).trim();
        if (!title) break;
        currentLesson = { key: '', title, blocks: [] };
        lessonQuestionCount = 0;
        lessons.push(currentLesson);
        break;
      }
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const text = plainText(inlineOf(node)).trim();
        if (!text) break;
        if (node.name !== 'h3' && currentLesson) {
          warnings.push(`${location()}: '${text}' uses ${node.name.replace('h', 'Heading ')}. It is shown as a section heading, like Heading 3.`);
        }
        addBlock({ type: 'heading', text }, text);
        break;
      }
      case 'ol':
      case 'ul': {
        const items = readListItems(node, warnings, location());
        if (items.length > 0) addBlock({ type: node.name === 'ol' ? 'steps' : 'points', items }, plainText(items[0]!));
        break;
      }
      case 'table': {
        const table = readTable($, node);
        if (table) addBlock(table, 'a table');
        break;
      }
      default: {
        const text = $(node).text().trim();
        if (text) warnings.push(`${location()}: skipped content that isn't a supported block: ${quote(text)}.`);
      }
    }
  }

  if (quizLines) reportUnclosedQuiz();
  if (!moduleTitle) errors.unshift("No Heading 1 found. Use Word's Heading 1 style for the module title.");
  if (lessons.length === 0) errors.push("No Heading 2 found. Start each lesson with Word's Heading 2 style.");

  // Lesson keys: the title's slug, made unique within the module. A re-uploaded module produces
  // the same key for a lesson whose title is unchanged, which is what keeps learner progress.
  const usedKeys = new Set<string>();
  const reportedDuplicates = new Set<string>();
  lessons.forEach((lesson, index) => {
    const baseKey = slugify(lesson.title) || `lesson-${index + 1}`;
    let key = baseKey;
    for (let suffix = 2; usedKeys.has(key); suffix += 1) key = `${baseKey}-${suffix}`;
    if (key !== baseKey && !reportedDuplicates.has(baseKey)) {
      warnings.push(
        `More than one lesson is called '${lesson.title}'. Give each lesson a different title so learners keep their progress when you upload a new version.`,
      );
      reportedDuplicates.add(baseKey);
    }
    usedKeys.add(key);
    lesson.key = key;
    if (lesson.blocks.length === 0) warnings.push(`${lessonLocation(lesson)} has no content under its heading.`);
  });

  return { module: moduleTitle ? { title: moduleTitle } : null, lessons, errors, warnings };
}
