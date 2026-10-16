import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSampleModuleDocx } from './sample-module';

// Writes tests/fixtures/sample-module.docx. Run with: npx tsx tests/fixtures/generate-sample-module.ts
buildSampleModuleDocx().then((bytes) => {
  const outputPath = join(__dirname, 'sample-module.docx');
  writeFileSync(outputPath, bytes);
  console.log(`Wrote ${outputPath} (${bytes.length} bytes)`);
});
