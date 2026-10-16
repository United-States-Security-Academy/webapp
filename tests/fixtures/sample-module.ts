import { buildDocx, bulletedList, heading1, heading2, heading3, image, numberedList, paragraph, quiz, table } from './docx-builder';

// The content of sample-module.docx: every block type, a lesson with a two-question quiz and a
// lesson without one. Regenerate the .docx after changing this with:
//   npx tsx tests/fixtures/generate-sample-module.ts
export function buildSampleModuleDocx(): Promise<Buffer> {
  return buildDocx([
    heading1('Module 1: Patrol Basics'),

    heading2('Patrol procedures'),
    heading3('Before you start'),
    paragraph(['Check your ', { text: 'radio', bold: true }, ' before every shift.']),
    numberedList('Turn the radio on', 'Test the channel'),
    bulletedList('Flashlight', 'Notebook'),
    paragraph([{ text: 'Note:', bold: true }, ' Charge batteries nightly.']),
    paragraph('Warning: Never patrol alone at night.'),
    table([
      ['Item', 'Count'],
      ['Radio', '1'],
    ]),
    image('Academy badge'),
    quiz(
      'Q: What do you check first?',
      'A) Your phone',
      '*B) Your radio',
      'Explain: Communication comes first.',
      'Q: How often are batteries charged?',
      '*A) Nightly',
      'B) Weekly',
    ),

    heading2('Access control'),
    paragraph('Only let in visitors with a valid pass.'),
    numberedList('Ask for the pass', 'Check the photo'),
  ]);
}
