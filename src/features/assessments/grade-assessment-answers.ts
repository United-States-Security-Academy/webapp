import type { QuestionWithChoices } from './assessment-types';

export interface GradedAnswer {
  questionId: string;
  // Null when the question was left unanswered (only allowed when time ran out).
  selectedChoiceId: string | null;
  isCorrect: boolean;
}

export type GradingResult =
  | { success: true; correctCount: number; totalQuestions: number; answers: GradedAnswer[] }
  | { success: false; error: string };

// Grades a set of picked answers against the answer key. `allowUnanswered` is for a timed attempt
// whose time ran out: whatever wasn't answered counts as wrong instead of blocking submission.
export function gradeAssessmentAnswers(
  questions: QuestionWithChoices[],
  selectedChoiceIdByQuestionId: Record<string, string>,
  { allowUnanswered }: { allowUnanswered: boolean },
): GradingResult {
  if (questions.length === 0) return { success: false, error: 'This assessment has no questions yet.' };

  const answers: GradedAnswer[] = [];
  for (const question of questions) {
    const selectedChoiceId = selectedChoiceIdByQuestionId[question.id];
    if (!selectedChoiceId) {
      if (!allowUnanswered) return { success: false, error: 'Answer every question before submitting.' };
      answers.push({ questionId: question.id, selectedChoiceId: null, isCorrect: false });
      continue;
    }
    const selectedChoice = question.choices.find((choice) => choice.id === selectedChoiceId);
    if (!selectedChoice) return { success: false, error: 'One of the submitted answers is invalid.' };
    answers.push({ questionId: question.id, selectedChoiceId, isCorrect: selectedChoice.isCorrect });
  }

  return {
    success: true,
    correctCount: answers.filter((answer) => answer.isCorrect).length,
    totalQuestions: questions.length,
    answers,
  };
}
