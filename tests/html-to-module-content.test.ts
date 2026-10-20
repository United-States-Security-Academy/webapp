import { describe, expect, it } from 'vitest';
import { htmlToModuleContent } from '@/features/structured-courses/html-to-module-content';

function parseOk(html: string) {
  const result = htmlToModuleContent(html);
  if (result.errors.length > 0) throw new Error(`Expected no errors, got: ${result.errors.join(' | ')}`);
  return result;
}

describe('htmlToModuleContent', () => {
  it('maps headings to module, lessons and sections', () => {
    const { module, lessons } = parseOk('<h1>Patrol Basics</h1><h2>Lesson One</h2><h3>Overview</h3><p>Hello</p><h2>Lesson Two</h2><p>Bye</p>');
    expect(module).toEqual({ title: 'Patrol Basics' });
    expect(lessons.map((lesson) => [lesson.key, lesson.title])).toEqual([
      ['lesson-one', 'Lesson One'],
      ['lesson-two', 'Lesson Two'],
    ]);
    expect(lessons[0]?.blocks).toEqual([
      { type: 'heading', text: 'Overview' },
      { type: 'text', content: [{ text: 'Hello' }] },
    ]);
  });

  it('keeps bold, italic and safe links, and drops unsafe links', () => {
    const { lessons } = parseOk(
      '<h1>M</h1><h2>L</h2><p>Plain <strong>bold</strong> <em>it</em> <a href="https://x.test">link</a> <a href="javascript:alert(1)">bad</a></p>',
    );
    expect(lessons[0]?.blocks[0]).toEqual({
      type: 'text',
      content: [
        { text: 'Plain ' },
        { text: 'bold', bold: true },
        { text: ' ' },
        { text: 'it', italic: true },
        { text: ' ' },
        { text: 'link', href: 'https://x.test' },
        { text: ' bad' },
      ],
    });
  });

  it('maps numbered lists to steps and bulleted lists to points, flattening nested lists', () => {
    const result = parseOk('<h1>M</h1><h2>L</h2><ol><li>First<ol><li>Sub</li></ol></li><li>Second</li></ol><ul><li>Point</li></ul>');
    expect(result.lessons[0]?.blocks).toEqual([
      { type: 'steps', items: [[{ text: 'First' }], [{ text: 'Sub' }], [{ text: 'Second' }]] },
      { type: 'points', items: [[{ text: 'Point' }]] },
    ]);
    expect(result.warnings).toEqual(["Lesson 'L': a list inside a list was flattened into one level."]);
  });

  it('warns about flattened lists once per lesson', () => {
    const nestedList = '<ul><li>A<ul><li>a</li></ul></li><li>B<ul><li>b</li></ul></li></ul>';
    const result = parseOk(`<h1>M</h1><h2>One</h2>${nestedList}${nestedList}<h2>Two</h2>${nestedList}`);
    expect(result.warnings).toEqual([
      "Lesson 'One': a list inside a list was flattened into one level.",
      "Lesson 'Two': a list inside a list was flattened into one level.",
    ]);
  });

  it('reads tables and detects a header row', () => {
    const { lessons } = parseOk(
      '<h1>M</h1><h2>L</h2><table><thead><tr><th><p>Rank</p></th></tr></thead><tbody><tr><td><p>One</p><p>Two</p></td></tr></tbody></table>',
    );
    expect(lessons[0]?.blocks[0]).toEqual({
      type: 'table',
      hasHeaderRow: true,
      rows: [[[{ text: 'Rank' }]], [[{ text: 'One\nTwo' }]]],
    });
  });

  it('turns images into image blocks using the uploaded storage path', () => {
    const { lessons } = parseOk('<h1>M</h1><h2>L</h2><p><img src="course/abc/1.png" alt="A badge" /></p>');
    expect(lessons[0]?.blocks).toEqual([{ type: 'image', storagePath: 'course/abc/1.png', alt: 'A badge' }]);
  });

  it('turns "Note:" and "Warning:" paragraphs into callouts, even when the prefix is bold', () => {
    const { lessons } = parseOk('<h1>M</h1><h2>L</h2><p><strong>Note:</strong> Check twice.</p><p>Warning: Hot surface</p>');
    expect(lessons[0]?.blocks).toEqual([
      { type: 'callout', variant: 'note', content: [{ text: 'Check twice.' }] },
      { type: 'callout', variant: 'warning', content: [{ text: 'Hot surface' }] },
    ]);
  });

  it('reads a quiz written one line per paragraph', () => {
    const { lessons } = parseOk(
      '<h1>M</h1><h2>L</h2><p>[QUIZ]</p><p>Q: Ready?</p><p>A) No</p><p>*B) Yes</p><p>Explain: Always.</p><p>[/QUIZ]</p><p>After</p>',
    );
    expect(lessons[0]?.blocks).toEqual([
      { type: 'quiz', questions: [{ prompt: 'Ready?', options: ['No', 'Yes'], correctIndex: 1, explanation: 'Always.' }] },
      { type: 'text', content: [{ text: 'After' }] },
    ]);
  });

  it('reads a quiz written in one paragraph with line breaks, and options Word turned into a list', () => {
    const lineBreakQuiz = parseOk('<h1>M</h1><h2>L</h2><p>[QUIZ]<br />Q: Ready?<br />*A) Yes<br />B) No<br />[/QUIZ]<br />Afterwards</p>');
    expect(lineBreakQuiz.lessons[0]?.blocks).toEqual([
      { type: 'quiz', questions: [{ prompt: 'Ready?', options: ['Yes', 'No'], correctIndex: 0 }] },
      { type: 'text', content: [{ text: 'Afterwards' }] },
    ]);

    const listQuiz = parseOk('<h1>M</h1><h2>L</h2><p>[QUIZ]</p><p>Q: Ready?</p><ol><li>No</li><li>*Yes</li></ol><p>[/QUIZ]</p>');
    expect(listQuiz.lessons[0]?.blocks[0]).toMatchObject({ type: 'quiz', questions: [{ options: ['No', 'Yes'], correctIndex: 1 }] });
  });

  it('makes lesson keys unique within the module, and warns about the repeated title', () => {
    const { lessons, warnings } = parseOk('<h1>M</h1><h2>Review</h2><p>a</p><h2>Review</h2><p>b</p><h2>!!!</h2><p>c</p>');
    expect(lessons.map((lesson) => lesson.key)).toEqual(['review', 'review-2', 'lesson-3']);
    expect(warnings).toEqual([expect.stringContaining("More than one lesson is called 'Review'")]);
  });

  it('gives a lesson the same key when its title only changes in capitals or spacing, so progress is kept', () => {
    const first = parseOk('<h1>M</h1><h2>Patrol procedures</h2><p>a</p>');
    const second = parseOk('<h1>M</h1><h2>Patrol  Procedures</h2><p>b</p>');
    expect(second.lessons[0]?.key).toBe(first.lessons[0]?.key);
  });

  it('turns Heading 2s with nothing under them into topics of the next lesson', () => {
    const { lessons, warnings } = parseOk(
      '<h1>M</h1><h2>Rules and Laws</h2><h2>Uniforms</h2><h2>Pocket Card</h2><p>x</p><h2>Next</h2><p>y</p>',
    );
    expect(lessons.map((lesson) => [lesson.key, lesson.title, lesson.topics])).toEqual([
      ['pocket-card', 'Pocket Card', ['Rules and Laws', 'Uniforms']],
      ['next', 'Next', undefined],
    ]);
    expect(warnings).toEqual([]);
  });

  it('warns about an empty lesson at the end of the module', () => {
    const { warnings } = parseOk('<h1>M</h1><h2>Full</h2><p>x</p><h2>Empty</h2>');
    expect(warnings).toEqual(["Lesson 'Empty' has no content under its heading."]);
  });

  it.each([
    ['no Heading 1', '<h2>L</h2><p>x</p>', "No Heading 1 found. Use Word's Heading 1 style for the module title."],
    [
      'two Heading 1s',
      '<h1>A</h1><h1>B</h1><h2>L</h2><p>x</p>',
      "More than one Heading 1 found ('A' and 'B'). Each file is one module, so use Heading 1 only once, for the module title.",
    ],
    ['no lessons', '<h1>M</h1>', "No Heading 2 found. Start each lesson with Word's Heading 2 style."],
    [
      'text before the first lesson',
      '<h1>M</h1><p>Welcome to the course</p><h2>L</h2><p>x</p>',
      'Text appears before the first Heading 2 ("Welcome to the course"). Add a lesson heading above it.',
    ],
    [
      'a quiz with no correct answer',
      '<h1>M</h1><h2>Patrol procedures</h2><p>[QUIZ]</p><p>Q: a</p><p>*A) y</p><p>B) z</p><p>Q: b</p><p>A) y</p><p>B) z</p><p>[/QUIZ]</p>',
      "Lesson 'Patrol procedures', quiz question 2 has no correct answer marked with *.",
    ],
    [
      'an unclosed quiz at the end of the file',
      '<h1>M</h1><h2>Access control</h2><p>[QUIZ]</p><p>Q: x</p>',
      "[QUIZ] in lesson 'Access control' has no closing [/QUIZ].",
    ],
    [
      'an unclosed quiz followed by a heading',
      '<h1>M</h1><h2>Access control</h2><p>[QUIZ]</p><p>Q: x</p><p>*A) y</p><p>B) z</p><h2>Next</h2><p>x</p>',
      "[QUIZ] in lesson 'Access control' has no closing [/QUIZ].",
    ],
    ['a [/QUIZ] with no [QUIZ]', '<h1>M</h1><h2>L</h2><p>x</p><p>[/QUIZ]</p>', "Lesson 'L' has a [/QUIZ] with no [QUIZ] before it."],
  ])('reports a file with %s', (_label, html, expectedError) => {
    expect(htmlToModuleContent(html).errors).toEqual([expectedError]);
  });

  it('numbers quiz questions across every quiz in a lesson, restarting for each lesson', () => {
    const quiz = (correct: boolean) => `<p>[QUIZ]</p><p>Q: q</p><p>${correct ? '*' : ''}A) y</p><p>B) z</p><p>[/QUIZ]</p>`;
    const { errors } = htmlToModuleContent(`<h1>M</h1><h2>One</h2>${quiz(true)}${quiz(false)}<h2>Two</h2>${quiz(false)}`);
    expect(errors).toEqual([
      "Lesson 'One', quiz question 2 has no correct answer marked with *.",
      "Lesson 'Two', quiz question 1 has no correct answer marked with *.",
    ]);
  });

  it('lists every problem in the file at once, and keeps no quiz that has an error', () => {
    const result = htmlToModuleContent('<p>Intro</p><h2>A</h2><p>[QUIZ]</p><p>Q: x</p><p>A) y</p><p>B) z</p><p>[/QUIZ]</p><h2>B</h2><p>[QUIZ]</p>');
    expect(result.errors).toEqual([
      "No Heading 1 found. Use Word's Heading 1 style for the module title.",
      'Text appears before the first Heading 2 ("Intro"). Add a lesson heading above it.',
      "Lesson 'A', quiz question 1 has no correct answer marked with *.",
      "[QUIZ] in lesson 'B' has no closing [/QUIZ].",
    ]);
    expect(result.module).toBeNull();
    expect(result.lessons[0]?.blocks).toEqual([]);
  });
});
