import { describe, expect, it } from 'vitest';
import { gradeAssessmentAnswers } from '@/features/assessments/grade-assessment-answers';
import type { QuestionWithChoices } from '@/features/assessments/assessment-types';

function question(id: string, correctChoiceId: string, otherChoiceId: string): QuestionWithChoices {
  const base = { assessmentId: 'a', questionText: id, position: 0, createdAt: new Date() };
  return {
    id,
    ...base,
    choices: [
      { id: correctChoiceId, questionId: id, choiceText: 'right', isCorrect: true, position: 0 },
      { id: otherChoiceId, questionId: id, choiceText: 'wrong', isCorrect: false, position: 1 },
    ],
  };
}

const questions = [question('q1', 'q1-right', 'q1-wrong'), question('q2', 'q2-right', 'q2-wrong'), question('q3', 'q3-right', 'q3-wrong')];

describe('gradeAssessmentAnswers', () => {
  it('counts correct answers', () => {
    const result = gradeAssessmentAnswers(questions, { q1: 'q1-right', q2: 'q2-wrong', q3: 'q3-right' }, { allowUnanswered: false });
    expect(result).toMatchObject({ success: true, correctCount: 2, totalQuestions: 3 });
  });

  it('requires every question to be answered on a normal submit', () => {
    const result = gradeAssessmentAnswers(questions, { q1: 'q1-right' }, { allowUnanswered: false });
    expect(result).toEqual({ success: false, error: 'Answer every question before submitting.' });
  });

  it('marks unanswered questions wrong when time has run out', () => {
    const result = gradeAssessmentAnswers(questions, { q1: 'q1-right' }, { allowUnanswered: true });
    expect(result.success && result.correctCount).toBe(1);
    expect(result.success && result.answers.filter((answer) => answer.selectedChoiceId === null)).toHaveLength(2);
  });

  it('rejects a choice that belongs to a different question', () => {
    const result = gradeAssessmentAnswers(questions, { q1: 'q2-right', q2: 'q2-right', q3: 'q3-right' }, { allowUnanswered: false });
    expect(result).toEqual({ success: false, error: 'One of the submitted answers is invalid.' });
  });

  it('grades an attempt with no answers at all as zero when time ran out', () => {
    const result = gradeAssessmentAnswers(questions, {}, { allowUnanswered: true });
    expect(result).toMatchObject({ success: true, correctCount: 0, totalQuestions: 3 });
  });
});
