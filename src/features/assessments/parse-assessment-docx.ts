import mammoth from 'mammoth';
import { load } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { checkWordFile } from '@/features/structured-courses/parse-structured-module';
import { MAX_CHOICES_PER_QUESTION } from './validate-imported-questions';

// One multiple-choice question read from a Word file. `correctChoiceIndex` is only set when the
// file itself says which answer is right ("Answer: B", "*B. ...", or an answer key); otherwise the
// instructor picks it in the import preview before anything is saved.
export interface ParsedAssessmentQuestion {
  questionText: string;
  choices: string[];
  correctChoiceIndex: number | null;
}

// Questions can be imported only when `errors` is empty. `warnings` are lines that were skipped.
export interface ParsedAssessment {
  questions: ParsedAssessmentQuestion[];
  errors: string[];
  warnings: string[];
}

// One paragraph or list item of the document. Word often turns "1." / "A." into automatic
// numbering, which drops that text — so list items carry where they sit in the list instead.
export interface AssessmentLine {
  text: string;
  // Null for a plain paragraph; 0 for a top-level list item, 1+ for nested ones.
  listDepth: number | null;
  // How many list items in a row, this one included, use the same Word list format (0 for a plain
  // paragraph). A numbered question directly followed by its lettered choices is then a run of 1
  // and a run of 4, even though mammoth puts them all in one <ol>.
  listSize: number;
  // A list item with a nested list under it, the way Word indents choices beneath a question.
  hasNestedList: boolean;
}

// "1. Text", "1) Text", "Q1. Text", "Question 1: Text"
const NUMBERED_QUESTION_PATTERN = /^(?:Q(?:uestion)?\s*)?\d+\s*[.):]\s*(.+)$/i;
// "Q: Text", "Question: Text"
const LABELLED_QUESTION_PATTERN = /^Q(?:uestion)?\s*[:.]\s*(.+)$/i;
// "A. Text", "b) Text", "(C) Text", "*D. Text" — the * marks the correct answer.
const LETTERED_CHOICE_PATTERN = /^(\*?)\s*\(?([A-Ja-j])\s*[.)]\s+(.+)$/;
// An unlettered list item, where Word already removed the letter: "Text" or "*Text".
const STARRED_TEXT_PATTERN = /^(\*?)\s*(.*)$/;
// "Answer: B", "Correct answer - (b)", "Ans: B. Texas Occupations Code..."
const ANSWER_PATTERN = /^(?:correct\s+)?(?:answer|ans)\s*[:.\-–]\s*\(?([A-Ja-j])\)?(?=[\s.)]|$)/i;
const ANSWER_KEY_HEADING_PATTERN = /^answer\s+key\b/i;
// One answer-key entry: "1. B", "1) b", "1 - (B)", "1: B"
const ANSWER_KEY_ENTRY_PATTERN = /^(\d+)\s*[.):\-–]?\s*\(?([A-Ja-j])\)?(?=[\s.)]|$)/;

const LETTERS = 'ABCDEFGHIJ';

interface QuestionDraft {
  text: string;
  choices: { text: string; letter: string | null; isStarred: boolean }[];
  answerLetter: string | null;
}

function quote(text: string): string {
  return text.length > 60 ? `"${text.slice(0, 60)}..."` : `"${text}"`;
}

export function parseAssessmentLines(lines: AssessmentLine[]): ParsedAssessment {
  const drafts: QuestionDraft[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let current: QuestionDraft | null = null;
  let isInAnswerKey = false;

  function startQuestion(text: string) {
    current = { text, choices: [], answerLetter: null };
    drafts.push(current);
  }

  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;

    if (ANSWER_KEY_HEADING_PATTERN.test(text)) {
      isInAnswerKey = true;
      continue;
    }
    if (isInAnswerKey) {
      const entryMatch = ANSWER_KEY_ENTRY_PATTERN.exec(text);
      const keyedDraft = entryMatch ? drafts[Number(entryMatch[1]) - 1] : undefined;
      if (entryMatch && keyedDraft) keyedDraft.answerLetter = entryMatch[2]!.toUpperCase();
      else if (entryMatch) errors.push(`The answer key lists question ${entryMatch[1]}, but the file has only ${drafts.length} questions.`);
      else warnings.push(`Skipped ${quote(text)} in the answer key: write each entry like "1. B".`);
      continue;
    }

    const answerMatch = ANSWER_PATTERN.exec(text);
    if (answerMatch) {
      if (current) (current as QuestionDraft).answerLetter = answerMatch[1]!.toUpperCase();
      else warnings.push(`Skipped ${quote(text)}: it comes before the first question.`);
      continue;
    }

    const questionMatch = NUMBERED_QUESTION_PATTERN.exec(text) ?? LABELLED_QUESTION_PATTERN.exec(text);
    if (questionMatch) {
      startQuestion(questionMatch[1]!.trim());
      continue;
    }

    const draft = current as QuestionDraft | null;
    const choiceMatch = LETTERED_CHOICE_PATTERN.exec(text);
    if (choiceMatch && draft) {
      draft.choices.push({ text: choiceMatch[3]!.trim(), letter: choiceMatch[2]!.toUpperCase(), isStarred: choiceMatch[1] === '*' });
      continue;
    }

    if (line.listDepth !== null) {
      // A question is a top-level list item with no neighbours in the same list format, or with
      // choices nested under it. Any other list item after a question is one of its choices.
      const isChoice = draft !== null && !line.hasNestedList && (line.listDepth > 0 || line.listSize > 1);
      if (isChoice) {
        const [, star, choiceText] = STARRED_TEXT_PATTERN.exec(text)!;
        draft.choices.push({ text: choiceText!.trim(), letter: null, isStarred: star === '*' });
      } else {
        startQuestion(text);
      }
      continue;
    }

    // A plain paragraph: the title or instructions before the first question, the rest of a
    // question's text when it runs over several lines, or an unnumbered question ending in "?".
    if (!draft) continue;
    if (draft.choices.length === 0) draft.text = `${draft.text} ${text}`.trim();
    else if (text.endsWith('?')) startQuestion(text);
    else warnings.push(`Skipped ${quote(text)} after question ${drafts.length}. Start each question with its number, like "${drafts.length + 1}.".`);
  }

  const questions: ParsedAssessmentQuestion[] = [];
  drafts.forEach((draft, index) => {
    const label = `Question ${index + 1} (${quote(draft.text)})`;
    if (draft.choices.length < 2) {
      errors.push(`${label} needs at least two answer choices, such as "A. ..." and "B. ...".`);
      return;
    }
    if (draft.choices.length > MAX_CHOICES_PER_QUESTION) {
      errors.push(`${label} has ${draft.choices.length} choices; the most allowed is ${MAX_CHOICES_PER_QUESTION}.`);
      return;
    }

    const choiceLetters = draft.choices.map((choice, choiceIndex) => choice.letter ?? LETTERS[choiceIndex]!);
    const starredIndexes = draft.choices.flatMap((choice, choiceIndex) => (choice.isStarred ? [choiceIndex] : []));
    if (starredIndexes.length > 1) {
      errors.push(`${label} has more than one choice marked with *. Mark only the correct one.`);
      return;
    }

    let correctChoiceIndex: number | null = starredIndexes[0] ?? null;
    if (draft.answerLetter) {
      const answerIndex = choiceLetters.indexOf(draft.answerLetter);
      if (answerIndex === -1) {
        errors.push(`${label} gives the answer as ${draft.answerLetter}, but has no choice ${draft.answerLetter}.`);
        return;
      }
      if (correctChoiceIndex !== null && correctChoiceIndex !== answerIndex) {
        errors.push(`${label} marks one choice with * but gives a different answer (${draft.answerLetter}). Keep only one.`);
        return;
      }
      correctChoiceIndex = answerIndex;
    }

    questions.push({ questionText: draft.text, choices: draft.choices.map((choice) => choice.text), correctChoiceIndex });
  });

  if (drafts.length === 0) {
    errors.push('No questions were found. Number each question ("1. ...") and letter its choices ("A. ...") on the lines below it.');
  }

  return { questions, errors, warnings };
}

function isElement(node: AnyNode): node is Element {
  return node.type === 'tag';
}

// The element's text, split where Word had a line break (Shift+Enter). Nested lists are left out;
// they are read as their own lines.
function textLinesOf(node: Element): string[] {
  const lines = [''];
  function visit(child: AnyNode) {
    if (child.type === 'text') lines[lines.length - 1] += child.data;
    else if (isElement(child)) {
      if (child.name === 'br') lines.push('');
      else if (child.name !== 'ol' && child.name !== 'ul') child.children.forEach(visit);
    }
  }
  node.children.forEach(visit);
  return lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// Mammoth renders every run of numbered paragraphs as one <ol>, so a numbered question followed by
// a lettered list of choices comes out as a single list. Before conversion, each list paragraph's
// text is prefixed with a marker naming its Word list format (one per list definition and level),
// which htmlToAssessmentLines reads back and removes. The marker uses Unicode private-use
// characters, which never appear in real text.
const MARK_START = String.fromCharCode(0xe000);
const MARK_END = String.fromCharCode(0xe001);
const LIST_FORMAT_MARK_PATTERN = new RegExp(`^${MARK_START}([0-9]+)${MARK_END}`);

interface MammothElement {
  type: string;
  value?: string;
  numbering?: object | null;
  children?: MammothElement[];
}

function firstTextOf(element: MammothElement): MammothElement | null {
  if (element.type === 'text') return element;
  for (const child of element.children ?? []) {
    const text = firstTextOf(child);
    if (text) return text;
  }
  return null;
}

function markListFormats(document: MammothElement): MammothElement {
  const formatIds = new Map<object, number>();
  function visit(element: MammothElement) {
    if (element.type === 'paragraph' && element.numbering) {
      if (!formatIds.has(element.numbering)) formatIds.set(element.numbering, formatIds.size);
      const firstText = firstTextOf(element);
      if (firstText) firstText.value = `${MARK_START}${formatIds.get(element.numbering)}${MARK_END}${firstText.value ?? ''}`;
    }
    element.children?.forEach(visit);
  }
  visit(document);
  return document;
}

// Turns mammoth's HTML into the paragraphs and list items the parser reads, in document order.
export function htmlToAssessmentLines(html: string): AssessmentLine[] {
  const $ = load(html);
  const lines: AssessmentLine[] = [];
  // The list format of each line (from markListFormats), or its <ol> when unmarked.
  const listFormats: (string | null)[] = [];

  function addLine(rawText: string, listDepth: number | null, fallbackFormat: string, hasNestedList = false) {
    const mark = LIST_FORMAT_MARK_PATTERN.exec(rawText);
    const text = rawText.replace(LIST_FORMAT_MARK_PATTERN, '').trim();
    if (!text) return;
    lines.push({ text, listDepth, listSize: 0, hasNestedList });
    listFormats.push(listDepth === null ? null : mark ? `format-${mark[1]}` : fallbackFormat);
  }

  let listCount = 0;
  function addList(list: Element, depth: number) {
    const listKey = `list-${listCount++}`;
    for (const item of list.children.filter((child): child is Element => isElement(child) && child.name === 'li')) {
      const nestedLists = item.children.filter((child): child is Element => isElement(child) && (child.name === 'ol' || child.name === 'ul'));
      const [firstLine, ...moreLines] = textLinesOf(item);
      if (firstLine) addLine(firstLine, depth, listKey, nestedLists.length > 0);
      for (const text of moreLines) addLine(text, null, listKey);
      nestedLists.forEach((nestedList) => addList(nestedList, depth + 1));
    }
  }

  function visit(node: AnyNode) {
    if (!isElement(node)) return;
    if (node.name === 'ol' || node.name === 'ul') addList(node, 0);
    else if (/^(p|h[1-6])$/.test(node.name)) textLinesOf(node).forEach((text) => addLine(text, null, ''));
    // Tables and other containers: read the paragraphs inside them in order.
    else node.children.forEach(visit);
  }

  $.root().children().each((_, node) => visit(node));

  // listSize: the length of each run of consecutive list lines sharing one format and depth.
  let runStart = 0;
  for (let index = 1; index <= lines.length; index++) {
    const sameRun =
      index < lines.length &&
      listFormats[index] !== null &&
      listFormats[index] === listFormats[runStart] &&
      lines[index]!.listDepth === lines[runStart]!.listDepth;
    if (sameRun) continue;
    if (listFormats[runStart] !== null) {
      for (let runIndex = runStart; runIndex < index; runIndex++) lines[runIndex]!.listSize = index - runStart;
    }
    runStart = index;
  }
  return lines;
}

export async function parseAssessmentDocx(fileName: string, fileBytes: Buffer): Promise<ParsedAssessment> {
  const fileCheck = checkWordFile(fileName, fileBytes);
  if (!fileCheck.success) return { questions: [], errors: [fileCheck.error], warnings: [] };

  let imageCount = 0;
  let html: string;
  try {
    const conversion = await mammoth.convertToHtml(
      { buffer: fileBytes },
      {
        transformDocument: markListFormats,
        // Questions are text only; pictures are dropped rather than embedded.
        convertImage: mammoth.images.imgElement(async () => {
          imageCount += 1;
          return { src: '' };
        }),
      },
    );
    html = conversion.value;
  } catch {
    return { questions: [], errors: ['This Word file could not be read. Open it in Word, save it again as .docx, and retry.'], warnings: [] };
  }

  const result = parseAssessmentLines(htmlToAssessmentLines(html));
  if (imageCount > 0) {
    result.warnings.push(`${imageCount} picture${imageCount === 1 ? ' was' : 's were'} left out: questions are imported as text only.`);
  }
  return result;
}
