import type { StructuredBlock, StructuredInline, StructuredLessonContent } from '@/db/schema/structured-courses';

// One utterance of the read-aloud: the block it belongs to (null for the lesson title), so the
// player can highlight what is being read.
export interface SpeechSegment {
  blockIndex: number | null;
  text: string;
}

// Some browsers (Chrome with its online voices) cut speech off after about 15 seconds, so a long
// block is read in pieces of at most this many characters, split between sentences.
const MAX_SEGMENT_LENGTH = 300;

function runsToText(runs: StructuredInline[]): string {
  return runs
    .map((run) => run.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

// Ends the text with punctuation so the voice pauses before the next item instead of running
// a list item straight into the next one.
function asSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[.!?:;]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function joinSentences(sentences: string[]): string {
  return sentences.map(asSentence).filter(Boolean).join(' ');
}

function blockToSpeech(block: StructuredBlock): string {
  switch (block.type) {
    case 'heading':
      return asSentence(block.text);
    case 'text':
      return asSentence(runsToText(block.content));
    case 'steps':
      return joinSentences(block.items.map((item, index) => `Step ${index + 1}: ${runsToText(item)}`));
    case 'points':
      return joinSentences(block.items.map(runsToText));
    case 'table': {
      const [firstRow, ...otherRows] = block.rows;
      const headers = block.hasHeaderRow && firstRow ? firstRow.map(runsToText) : null;
      const bodyRows = headers ? otherRows : block.rows;
      // Each cell is read with its column heading ("Item: Flashlight, Check: Batteries"), since
      // a listener can't glance back up at the header row.
      return joinSentences([
        'Table',
        ...bodyRows.map((row) =>
          row
            .map((cell, cellIndex) => {
              const cellText = runsToText(cell);
              const header = headers?.[cellIndex];
              return header && cellText ? `${header}: ${cellText}` : cellText;
            })
            .filter(Boolean)
            .join(', '),
        ),
      ]);
    }
    case 'image':
      return block.alt.trim() ? asSentence(`Picture: ${block.alt}`) : '';
    case 'callout':
      return asSentence(`${block.variant === 'warning' ? 'Warning' : 'Note'}: ${runsToText(block.content)}`);
    case 'quiz':
      // The question and its options only — never which option is correct or the explanation.
      return joinSentences([
        block.questions.length > 1 ? `Practice questions` : 'Practice question',
        ...block.questions.flatMap((question, questionIndex) => [
          block.questions.length > 1 ? `Question ${questionIndex + 1}: ${question.prompt}` : question.prompt,
          ...question.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}: ${option}`),
        ]),
        'Choose your answer on the screen',
      ]);
  }
}

// Splits text between sentences into pieces no longer than MAX_SEGMENT_LENGTH (a single longer
// sentence is split between words).
function splitForSpeech(text: string): string[] {
  const sentences = text.match(/[^.!?]+(?:[.!?]+|$)\s*/g) ?? [text];
  const pieces: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    for (const part of sentence.length > MAX_SEGMENT_LENGTH ? splitBetweenWords(sentence) : [sentence]) {
      if (current && current.length + part.length > MAX_SEGMENT_LENGTH) {
        pieces.push(current.trim());
        current = '';
      }
      current += part;
    }
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces;
}

function splitBetweenWords(text: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (const word of text.split(/(?<=\s)/)) {
    if (current && current.length + word.length > MAX_SEGMENT_LENGTH) {
      parts.push(current);
      current = '';
    }
    current += word;
  }
  if (current) parts.push(current);
  return parts;
}

// What the read-aloud says for a lesson, in order: the title, then each block. Pass only the
// blocks the learner can open — content still locked behind a quiz is never read out.
export function lessonToSpeechSegments(lesson: Pick<StructuredLessonContent, 'title'>, blocks: StructuredBlock[]): SpeechSegment[] {
  const segments: SpeechSegment[] = [{ blockIndex: null, text: asSentence(lesson.title) }];
  blocks.forEach((block, blockIndex) => {
    for (const text of splitForSpeech(blockToSpeech(block))) segments.push({ blockIndex, text });
  });
  return segments.filter((segment) => segment.text);
}
