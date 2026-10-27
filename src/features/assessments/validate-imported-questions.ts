export interface ImportedQuestion {
  questionText: string;
  choices: string[];
  correctChoiceIndex: number;
}

export const MAX_CHOICES_PER_QUESTION = 10;
export const MAX_IMPORTED_QUESTIONS = 300;
// Server Action request bodies are capped at 1 MB by Next.js (file plus form overhead), so the
// uploader stops a bigger file first with a clear message instead of a failed request.
export const MAX_ASSESSMENT_DOCX_BYTES = 900 * 1024;
export const TOO_LARGE_MESSAGE = 'This file is larger than 900 KB. Remove any pictures from it and upload again.';
const MAX_QUESTION_LENGTH = 2000;
const MAX_CHOICE_LENGTH = 1000;

export type ImportedQuestionsCheck = { success: true; questions: ImportedQuestion[] } | { success: false; error: string };

// The import preview runs in the browser, so what reaches the server is untrusted: rebuild every
// question from just the expected fields and require exactly one correct answer, so no imported
// question can ever be ungradable.
export function validateImportedQuestions(input: unknown): ImportedQuestionsCheck {
  if (!Array.isArray(input) || input.length === 0) return { success: false, error: 'There are no questions to import.' };
  if (input.length > MAX_IMPORTED_QUESTIONS) {
    return { success: false, error: `Import at most ${MAX_IMPORTED_QUESTIONS} questions at a time.` };
  }

  const questions: ImportedQuestion[] = [];
  for (const [index, item] of input.entries()) {
    const label = `Question ${index + 1}`;
    const { questionText, choices, correctChoiceIndex } = (item ?? {}) as Record<string, unknown>;

    if (typeof questionText !== 'string' || !questionText.trim()) return { success: false, error: `${label} has no text.` };
    if (questionText.length > MAX_QUESTION_LENGTH) {
      return { success: false, error: `${label} is longer than ${MAX_QUESTION_LENGTH} characters.` };
    }
    if (!Array.isArray(choices) || choices.length < 2 || choices.length > MAX_CHOICES_PER_QUESTION) {
      return { success: false, error: `${label} needs between 2 and ${MAX_CHOICES_PER_QUESTION} choices.` };
    }
    if (choices.some((choice) => typeof choice !== 'string' || !choice.trim() || choice.length > MAX_CHOICE_LENGTH)) {
      return { success: false, error: `${label} has an empty choice, or one longer than ${MAX_CHOICE_LENGTH} characters.` };
    }
    if (typeof correctChoiceIndex !== 'number' || !Number.isInteger(correctChoiceIndex) || correctChoiceIndex < 0 || correctChoiceIndex >= choices.length) {
      return { success: false, error: `Choose the correct answer for ${label.toLowerCase()}.` };
    }

    questions.push({
      questionText: questionText.trim(),
      choices: (choices as string[]).map((choice) => choice.trim()),
      correctChoiceIndex,
    });
  }
  return { success: true, questions };
}
