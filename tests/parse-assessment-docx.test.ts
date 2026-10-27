import { describe, expect, it } from 'vitest';
import { parseAssessmentDocx } from '@/features/assessments/parse-assessment-docx';
import { validateImportedQuestions } from '@/features/assessments/validate-imported-questions';
import { LEGACY_DOC_MESSAGE } from '@/features/structured-courses/parse-structured-module';
import { buildDocx, heading1, image, letteredList, listItem, numberedList, paragraph } from './fixtures/docx-builder';

async function parse(bodyParts: string[]) {
  return parseAssessmentDocx('final-exam.docx', await buildDocx(bodyParts));
}

const TEXAS_CHOICES = [
  "The company's employee handbook alone",
  'Texas Occupations Code Chapter 1702 and 37 TAC Chapter 35',
  'A handgun carry license and local business registration',
  'Client post orders and a local trade association handbook',
];

describe('parseAssessmentDocx', () => {
  it('reads typed question numbers and choice letters, leaving the answer to be picked', async () => {
    const result = await parse([
      heading1('Final Assessment'),
      paragraph('Answer every question.'),
      paragraph('1. Which sources establish the main Texas private security licensing framework?'),
      ...TEXAS_CHOICES.map((choice, index) => paragraph(`${'ABCD'[index]}. ${choice}`)),
      paragraph('2) Who issues security licenses?'),
      paragraph('a) The Texas DPS'),
      paragraph('b) The city council'),
    ]);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.questions).toEqual([
      {
        questionText: 'Which sources establish the main Texas private security licensing framework?',
        choices: TEXAS_CHOICES,
        correctChoiceIndex: null,
      },
      { questionText: 'Who issues security licenses?', choices: ['The Texas DPS', 'The city council'], correctChoiceIndex: null },
    ]);
  });

  it('pre-selects answers from "Answer:" lines, * marks and an answer key', async () => {
    const result = await parse([
      paragraph('1. First?'),
      paragraph('A. One'),
      paragraph('B. Two'),
      paragraph('Answer: B'),
      paragraph('2. Second?'),
      paragraph('A. One'),
      paragraph('*B. Two'),
      paragraph('C. Three'),
      paragraph('3. Third?'),
      paragraph('A. One'),
      paragraph('B. Two'),
      paragraph('C. Three'),
      paragraph('Answer Key'),
      paragraph('3. C'),
    ]);

    expect(result.errors).toEqual([]);
    expect(result.questions.map((question) => question.correctChoiceIndex)).toEqual([1, 1, 2]);
  });

  it("reads Word's automatic numbering: a numbered question followed by a lettered list", async () => {
    const result = await parse([
      numberedList('Which sources establish the main Texas private security licensing framework?'),
      letteredList(...TEXAS_CHOICES),
      numberedList('Who issues security licenses?'),
      letteredList('The Texas DPS', 'The city council'),
    ]);

    expect(result.errors).toEqual([]);
    expect(result.questions.map((question) => question.choices)).toEqual([TEXAS_CHOICES, ['The Texas DPS', 'The city council']]);
  });

  it('reads choices indented under their question in one numbered list', async () => {
    const result = await parse([
      listItem('First?', 1),
      listItem('One', 1, 1),
      listItem('Two', 1, 1),
      listItem('Second?', 1),
      listItem('Three', 1, 1),
      listItem('Four', 1, 1),
    ]);

    expect(result.errors).toEqual([]);
    expect(result.questions).toEqual([
      { questionText: 'First?', choices: ['One', 'Two'], correctChoiceIndex: null },
      { questionText: 'Second?', choices: ['Three', 'Four'], correctChoiceIndex: null },
    ]);
  });

  it('joins a question that runs over several paragraphs', async () => {
    const result = await parse([paragraph('1. A guard sees a door propped open.'), paragraph('What should they do first?'), paragraph('A. Close it'), paragraph('B. Report it')]);
    expect(result.questions[0]?.questionText).toBe('A guard sees a door propped open. What should they do first?');
  });

  it('lists every problem, naming the question', async () => {
    const result = await parse([
      paragraph('1. Only one choice?'),
      paragraph('A. Lonely'),
      paragraph('2. Bad answer letter?'),
      paragraph('A. One'),
      paragraph('B. Two'),
      paragraph('Answer: D'),
      paragraph('3. Two stars?'),
      paragraph('*A. One'),
      paragraph('*B. Two'),
    ]);

    expect(result.errors).toEqual([
      'Question 1 ("Only one choice?") needs at least two answer choices, such as "A. ..." and "B. ...".',
      'Question 2 ("Bad answer letter?") gives the answer as D, but has no choice D.',
      'Question 3 ("Two stars?") has more than one choice marked with *. Mark only the correct one.',
    ]);
  });

  it('reports a file with no questions', async () => {
    const result = await parse([paragraph('Just some notes.')]);
    expect(result.errors).toEqual([
      'No questions were found. Number each question ("1. ...") and letter its choices ("A. ...") on the lines below it.',
    ]);
  });

  it('warns about skipped lines and pictures', async () => {
    const result = await parse([paragraph('1. First?'), paragraph('A. One'), paragraph('B. Two'), paragraph('See page 4.'), image('Diagram')]);
    expect(result.questions).toHaveLength(1);
    expect(result.warnings).toEqual([
      'Skipped "See page 4." after question 1. Start each question with its number, like "2.".',
      '1 picture was left out: questions are imported as text only.',
    ]);
  });

  it('rejects files that are not .docx', async () => {
    const result = await parseAssessmentDocx('exam.doc', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    expect(result.errors).toEqual([LEGACY_DOC_MESSAGE]);
  });
});

describe('validateImportedQuestions', () => {
  const validQuestion = { questionText: ' First? ', choices: [' One ', 'Two'], correctChoiceIndex: 1 };

  it('keeps only the expected fields, trimmed', () => {
    expect(validateImportedQuestions([{ ...validQuestion, assessmentId: 'someone-else', isCorrect: true }])).toEqual({
      success: true,
      questions: [{ questionText: 'First?', choices: ['One', 'Two'], correctChoiceIndex: 1 }],
    });
  });

  it('requires a correct answer for every question', () => {
    expect(validateImportedQuestions([validQuestion, { ...validQuestion, correctChoiceIndex: null }])).toEqual({
      success: false,
      error: 'Choose the correct answer for question 2.',
    });
    expect(validateImportedQuestions([{ ...validQuestion, correctChoiceIndex: 2 }]).success).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(validateImportedQuestions('nope').success).toBe(false);
    expect(validateImportedQuestions([]).success).toBe(false);
    expect(validateImportedQuestions([null]).success).toBe(false);
    expect(validateImportedQuestions([{ ...validQuestion, choices: ['Only one'] }]).success).toBe(false);
    expect(validateImportedQuestions([{ ...validQuestion, choices: ['One', '  '] }]).success).toBe(false);
    expect(validateImportedQuestions([{ ...validQuestion, choices: ['One', 7] }]).success).toBe(false);
  });
});
