import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LEGACY_DOC_MESSAGE,
  checkWordFile,
  parseStructuredModule,
  type UploadImage,
} from '@/features/structured-courses/parse-structured-module';
import { TINY_PNG, buildDocx, heading1, heading2, image, paragraph, quiz } from './fixtures/docx-builder';

const SAMPLE_MODULE = readFileSync(join(__dirname, 'fixtures', 'sample-module.docx'));

function recordingUploader() {
  const uploads: { bytes: Buffer; contentType: string; imageNumber: number }[] = [];
  const uploadImage: UploadImage = async (bytes, contentType, imageNumber) => {
    uploads.push({ bytes, contentType, imageNumber });
    return `module-1/revision-1/image-${imageNumber}.png`;
  };
  return { uploads, uploadImage };
}

const noUploads: UploadImage = async () => {
  throw new Error('No image expected');
};

async function errorsFor(bodyParts: string[]) {
  const result = await parseStructuredModule('module.docx', await buildDocx(bodyParts), noUploads);
  return result.errors;
}

describe('checkWordFile', () => {
  it('rejects .doc files by name and by content, with the Save As message', () => {
    expect(checkWordFile('old.doc', new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toEqual({ success: false, error: LEGACY_DOC_MESSAGE });
    expect(checkWordFile('renamed.docx', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toEqual({
      success: false,
      error: LEGACY_DOC_MESSAGE,
    });
  });

  it('rejects other files and accepts a .docx', () => {
    expect(checkWordFile('notes.pdf', new Uint8Array([0x25, 0x50]))).toMatchObject({ success: false });
    expect(checkWordFile('module.DOCX', new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toEqual({ success: true });
  });
});

describe('parseStructuredModule with the sample module', () => {
  it('reads the module title and both lessons, one with a quiz and one without', async () => {
    const { uploadImage } = recordingUploader();
    const result = await parseStructuredModule('sample-module.docx', SAMPLE_MODULE, uploadImage);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.module).toEqual({ title: 'Module 1: Patrol Basics' });
    expect(result.lessons.map((lesson) => [lesson.key, lesson.title])).toEqual([
      ['patrol-procedures', 'Patrol procedures'],
      ['access-control', 'Access control'],
    ]);
    expect(result.lessons[1]?.blocks.some((block) => block.type === 'quiz')).toBe(false);
  });

  it('converts every block type', async () => {
    const { uploadImage } = recordingUploader();
    const result = await parseStructuredModule('sample-module.docx', SAMPLE_MODULE, uploadImage);

    expect(result.lessons[0]?.blocks).toEqual([
      { type: 'heading', text: 'Before you start' },
      { type: 'text', content: [{ text: 'Check your ' }, { text: 'radio', bold: true }, { text: ' before every shift.' }] },
      { type: 'steps', items: [[{ text: 'Turn the radio on' }], [{ text: 'Test the channel' }]] },
      { type: 'points', items: [[{ text: 'Flashlight' }], [{ text: 'Notebook' }]] },
      { type: 'callout', variant: 'note', content: [{ text: 'Charge batteries nightly.' }] },
      { type: 'callout', variant: 'warning', content: [{ text: 'Never patrol alone at night.' }] },
      {
        type: 'table',
        hasHeaderRow: true,
        rows: [
          [[{ text: 'Item' }], [{ text: 'Count' }]],
          [[{ text: 'Radio' }], [{ text: '1' }]],
        ],
      },
      { type: 'image', storagePath: 'module-1/revision-1/image-1.png', alt: 'Academy badge' },
      {
        type: 'quiz',
        questions: [
          { prompt: 'What do you check first?', options: ['Your phone', 'Your radio'], correctIndex: 1, explanation: 'Communication comes first.' },
          { prompt: 'How often are batteries charged?', options: ['Nightly', 'Weekly'], correctIndex: 0 },
        ],
      },
    ]);
    expect(result.lessons[1]?.blocks).toEqual([
      { type: 'text', content: [{ text: 'Only let in visitors with a valid pass.' }] },
      { type: 'steps', items: [[{ text: 'Ask for the pass' }], [{ text: 'Check the photo' }]] },
    ]);
  });

  it('uploads each embedded image and stores its path instead of the image data', async () => {
    const { uploads, uploadImage } = recordingUploader();
    const result = await parseStructuredModule('sample-module.docx', SAMPLE_MODULE, uploadImage);

    expect(uploads).toEqual([{ bytes: TINY_PNG, contentType: 'image/png', imageNumber: 1 }]);
    expect(JSON.stringify(result.lessons)).not.toContain('data:image');
  });
});

describe('parseStructuredModule errors', () => {
  it('reports a missing Heading 1', async () => {
    expect(await errorsFor([heading2('Lesson'), paragraph('x')])).toEqual([
      "No Heading 1 found. Use Word's Heading 1 style for the module title.",
    ]);
  });

  it('reports a second Heading 1', async () => {
    expect(await errorsFor([heading1('Patrol'), heading1('Access'), heading2('Lesson'), paragraph('x')])).toEqual([
      "More than one Heading 1 found ('Patrol' and 'Access'). Each file is one module, so use Heading 1 only once, for the module title.",
    ]);
  });

  it('reports a file with no lessons', async () => {
    expect(await errorsFor([heading1('Patrol'), paragraph('Just a paragraph')])).toEqual([
      'Text appears before the first Heading 2 ("Just a paragraph"). Add a lesson heading above it.',
      "No Heading 2 found. Start each lesson with Word's Heading 2 style.",
    ]);
  });

  it('reports text before the first Heading 2', async () => {
    expect(await errorsFor([heading1('Patrol'), paragraph('Welcome!'), heading2('Lesson'), paragraph('x')])).toEqual([
      'Text appears before the first Heading 2 ("Welcome!"). Add a lesson heading above it.',
    ]);
  });

  it('reports a quiz question with no correct answer', async () => {
    const errors = await errorsFor([
      heading1('Patrol'),
      heading2('Patrol procedures'),
      quiz('Q: First?', '*A) Yes', 'B) No', 'Q: Second?', 'A) Yes', 'B) No'),
    ]);
    expect(errors).toEqual(["Lesson 'Patrol procedures', quiz question 2 has no correct answer marked with *."]);
  });

  it('reports a quiz question with more than one correct answer', async () => {
    const errors = await errorsFor([heading1('Patrol'), heading2('Patrol procedures'), quiz('Q: First?', '*A) Yes', '*B) No')]);
    expect(errors).toEqual(["Lesson 'Patrol procedures', quiz question 1 has more than one answer marked with *. Mark only the correct one."]);
  });

  it('reports a [QUIZ] with no closing [/QUIZ]', async () => {
    const errors = await errorsFor([
      heading1('Patrol'),
      heading2('Access control'),
      paragraph('[QUIZ]'),
      paragraph('Q: Pass?'),
      paragraph('*A) Yes'),
      paragraph('B) No'),
      heading2('Next lesson'),
      paragraph('x'),
    ]);
    expect(errors).toEqual(["[QUIZ] in lesson 'Access control' has no closing [/QUIZ]."]);
  });

  it('reports a [/QUIZ] with no [QUIZ]', async () => {
    expect(await errorsFor([heading1('Patrol'), heading2('Access control'), paragraph('x'), paragraph('[/QUIZ]')])).toEqual([
      "Lesson 'Access control' has a [/QUIZ] with no [QUIZ] before it.",
    ]);
  });

  it('lists several problems at once', async () => {
    const errors = await errorsFor([
      paragraph('Intro'),
      heading2('Patrol procedures'),
      quiz('Q: First?', 'A) Yes', 'B) No'),
      heading2('Access control'),
      paragraph('[QUIZ]'),
    ]);
    expect(errors).toEqual([
      "No Heading 1 found. Use Word's Heading 1 style for the module title.",
      'Text appears before the first Heading 2 ("Intro"). Add a lesson heading above it.',
      "Lesson 'Patrol procedures', quiz question 1 has no correct answer marked with *.",
      "[QUIZ] in lesson 'Access control' has no closing [/QUIZ].",
    ]);
  });

  it('reports a picture in a format browsers cannot show, without uploading it', async () => {
    const docx = await buildDocx([heading1('Patrol'), heading2('Lesson'), image('Chart')], { imageContentType: 'image/x-emf' });
    const result = await parseStructuredModule('module.docx', docx, noUploads);
    expect(result.errors).toEqual([expect.stringMatching(/^Picture 1 in the file is in EMF format, .*Save as Picture/)]);
  });

  it('warns about a Word style it does not recognise and keeps the text', async () => {
    const result = await parseStructuredModule(
      'module.docx',
      await buildDocx([heading1('Patrol'), heading2('Lesson'), paragraph('Styled oddly', 'LessonTitle')]),
      noUploads,
    );
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([expect.stringContaining('Lesson Title')]);
    expect(result.lessons[0]?.blocks).toEqual([{ type: 'text', content: [{ text: 'Styled oddly' }] }]);
  });

  it('rejects a .doc file before trying to read it', async () => {
    const result = await parseStructuredModule('old.doc', Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), noUploads);
    expect(result).toEqual({ module: null, lessons: [], errors: [LEGACY_DOC_MESSAGE], warnings: [] });
  });

  it('reports a damaged .docx instead of throwing', async () => {
    const result = await parseStructuredModule('broken.docx', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]), noUploads);
    expect(result.errors).toEqual([expect.stringContaining('could not be read as a Word document')]);
  });
});
