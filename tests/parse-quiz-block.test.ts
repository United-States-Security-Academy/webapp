import { describe, expect, it } from 'vitest';
import { parseQuizBlock, type QuizLine } from '@/features/structured-courses/parse-quiz-block';

function lines(...texts: string[]): QuizLine[] {
  return texts.map((text) => ({ text, isListItem: false }));
}

const OPTIONS = { location: "Lesson 'Patrol procedures'", firstQuestionNumber: 1 };

describe('parseQuizBlock', () => {
  it('reads a question with lettered options, a starred correct answer and an explanation', () => {
    const result = parseQuizBlock(
      lines('Q: What should you do first?', 'A) Run', '*B) Assess the scene', 'C) Call a friend', 'Explain: Safety comes first.'),
      OPTIONS,
    );
    expect(result).toEqual({
      questions: [
        {
          prompt: 'What should you do first?',
          options: ['Run', 'Assess the scene', 'Call a friend'],
          correctIndex: 1,
          explanation: 'Safety comes first.',
        },
      ],
      questionCount: 1,
      errors: [],
    });
  });

  it('reads several questions in one block', () => {
    const result = parseQuizBlock(lines('Q: One?', '*A) Yes', 'B) No', 'Q: Two?', 'A) Yes', '*B) No'), OPTIONS);
    expect(result.questions.map((question) => question.correctIndex)).toEqual([0, 1]);
    expect(result.errors).toEqual([]);
  });

  it('reads options from a Word lettered list, where the letters are not in the text', () => {
    const result = parseQuizBlock(
      [
        { text: 'Q: Pick one', isListItem: false },
        { text: 'Wrong', isListItem: true },
        { text: '*Right', isListItem: true },
      ],
      OPTIONS,
    );
    expect(result.questions[0]).toEqual({ prompt: 'Pick one', options: ['Wrong', 'Right'], correctIndex: 1 });
  });

  it('accepts lowercase markers and "A." style letters', () => {
    const result = parseQuizBlock(lines('q: Lower?', 'a. One', '*b. Two', 'explain: because'), OPTIONS);
    expect(result.questions[0]?.correctIndex).toBe(1);
  });

  it('joins a question that continues onto the next line', () => {
    const result = parseQuizBlock(lines('Q: A long question', 'that continues here?', '*A) Yes', 'B) No'), OPTIONS);
    expect(result.questions[0]?.prompt).toBe('A long question that continues here?');
  });

  it('names the lesson and question number when no answer is marked correct', () => {
    const result = parseQuizBlock(lines('Q: Fine?', '*A) Yes', 'B) No', 'Q: Which?', 'A) One', 'B) Two'), OPTIONS);
    expect(result.errors).toEqual(["Lesson 'Patrol procedures', quiz question 2 has no correct answer marked with *."]);
  });

  it('numbers questions on from earlier quizzes in the same lesson', () => {
    const result = parseQuizBlock(lines('Q: Which?', 'A) One', 'B) Two'), { ...OPTIONS, firstQuestionNumber: 4 });
    expect(result.errors).toEqual([expect.stringContaining('quiz question 4 has no correct answer')]);
  });

  it('lists every problem in the block, not just the first', () => {
    const result = parseQuizBlock(lines('Q: One?', '*A) Yes', '*B) No', 'Q: Two?', '*A) Only', 'Q:', 'A) x', '*B) y'), OPTIONS);
    expect(result.errors).toEqual([
      expect.stringContaining('quiz question 1 has more than one answer marked with *'),
      expect.stringContaining('quiz question 2 needs at least two answer options'),
      expect.stringContaining('quiz question 3 has no question text after "Q:"'),
    ]);
    expect(result.questionCount).toBe(3);
  });

  it('rejects text before the first "Q:"', () => {
    const result = parseQuizBlock(lines('A) Orphan option'), OPTIONS);
    expect(result.errors).toEqual([expect.stringContaining('text before its first question: "A) Orphan option". Start each question with "Q:"')]);
  });

  it('rejects an unreadable line after the options', () => {
    const result = parseQuizBlock(lines('Q: Which?', '*A) One', 'B) Two', 'something else'), OPTIONS);
    expect(result.errors).toEqual([expect.stringContaining('quiz question 1 has a line that isn\'t an answer or an explanation: "something else"')]);
    expect(result.questions).toEqual([]);
  });

  it('rejects an empty block', () => {
    expect(parseQuizBlock([], OPTIONS).errors).toEqual(["Lesson 'Patrol procedures' has a [QUIZ] block with no questions in it."]);
  });
});
