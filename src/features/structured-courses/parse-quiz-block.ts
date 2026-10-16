import type { StructuredQuizQuestion } from '@/db/schema/structured-courses';

// One line of a [QUIZ] ... [/QUIZ] block. Word often turns "A) Option" lines into an automatic
// lettered list, which drops the "A)" text — so list items arrive flagged as options instead.
export type QuizLine = { text: string; isListItem: boolean };

export interface QuizParseOptions {
  // Used to start every error, e.g. "Lesson 'Patrol procedures'".
  location: string;
  // Questions are numbered across the whole lesson, so a second quiz in the same lesson carries on
  // from the first and the admin can count questions down the page to find the one named.
  firstQuestionNumber: number;
}

// Every problem in the block is listed (not just the first), so the admin can fix them all in
// one pass. Questions with a problem are left out of `questions`.
export interface QuizParseResult {
  questions: StructuredQuizQuestion[];
  // Every "Q:" in the block, including ones with errors, so numbering continues correctly.
  questionCount: number;
  errors: string[];
}

const QUESTION_PATTERN = /^Q:\s*(.*)$/i;
const EXPLAIN_PATTERN = /^Explain:\s*(.*)$/i;
// "A) text", "*B) text", "* C. text"
const LETTERED_OPTION_PATTERN = /^(\*?)\s*[A-Za-z][).]\s+(.*)$/;
// A list item, where Word already removed the letter: "text" or "*text"
const LIST_OPTION_PATTERN = /^(\*?)\s*(.*)$/;

interface QuestionDraft {
  number: number;
  prompt: string;
  options: { text: string; isCorrect: boolean }[];
  explanation?: string;
  hasError: boolean;
}

function quote(text: string): string {
  return text.length > 60 ? `"${text.slice(0, 60)}..."` : `"${text}"`;
}

export function parseQuizBlock(lines: QuizLine[], { location, firstQuestionNumber }: QuizParseOptions): QuizParseResult {
  const questions: StructuredQuizQuestion[] = [];
  const errors: string[] = [];
  let draft: QuestionDraft | null = null;
  let lastField: 'prompt' | 'option' | 'explanation' | null = null;
  let questionCount = 0;
  let hasReportedTextBeforeQuestion = false;

  function closeDraft() {
    if (!draft) return;
    const label = `${location}, quiz question ${draft.number}`;
    const correctIndexes = draft.options.flatMap((option, index) => (option.isCorrect ? [index] : []));
    if (!draft.prompt) errors.push(`${label} has no question text after "Q:".`);
    else if (draft.options.length < 2) errors.push(`${label} needs at least two answer options, such as "A) ..." and "B) ...".`);
    else if (correctIndexes.length === 0) errors.push(`${label} has no correct answer marked with *.`);
    else if (correctIndexes.length > 1) errors.push(`${label} has more than one answer marked with *. Mark only the correct one.`);
    else if (!draft.hasError) {
      questions.push({
        prompt: draft.prompt,
        options: draft.options.map((option) => option.text),
        correctIndex: correctIndexes[0]!,
        ...(draft.explanation ? { explanation: draft.explanation } : {}),
      });
    }
    draft = null;
  }

  for (const { text: rawText, isListItem } of lines) {
    const text = rawText.trim();
    if (!text) continue;

    const questionMatch = QUESTION_PATTERN.exec(text);
    if (questionMatch) {
      closeDraft();
      questionCount += 1;
      draft = { number: firstQuestionNumber + questionCount - 1, prompt: questionMatch[1]!.trim(), options: [], hasError: false };
      lastField = 'prompt';
      continue;
    }

    if (!draft) {
      if (!hasReportedTextBeforeQuestion) {
        errors.push(`${location}, a quiz has text before its first question: ${quote(text)}. Start each question with "Q:".`);
        hasReportedTextBeforeQuestion = true;
      }
      continue;
    }

    const explainMatch = EXPLAIN_PATTERN.exec(text);
    if (explainMatch) {
      draft.explanation = explainMatch[1]!.trim();
      lastField = 'explanation';
      continue;
    }

    const optionMatch = isListItem ? LIST_OPTION_PATTERN.exec(text) : LETTERED_OPTION_PATTERN.exec(text);
    if (optionMatch) {
      draft.options.push({ text: optionMatch[2]!.trim(), isCorrect: optionMatch[1] === '*' });
      lastField = 'option';
      continue;
    }

    // A line that continues the previous one (a long question or explanation split over lines).
    if (lastField === 'prompt' && draft.options.length === 0) {
      draft.prompt = `${draft.prompt} ${text}`.trim();
    } else if (lastField === 'explanation') {
      draft.explanation = `${draft.explanation ?? ''} ${text}`.trim();
    } else if (!draft.hasError) {
      errors.push(
        `${location}, quiz question ${draft.number} has a line that isn't an answer or an explanation: ${quote(text)}. ` +
          'Answers start with a letter, like "A) ...", and explanations start with "Explain:".',
      );
      draft.hasError = true;
    }
  }

  closeDraft();
  if (questionCount === 0 && errors.length === 0) errors.push(`${location} has a [QUIZ] block with no questions in it.`);
  return { questions, questionCount, errors };
}
