// tesseract.js defaults to fetching its worker script, WASM core, and language data from a
// third-party CDN at runtime. That's an extra point of failure (an unreachable/slow/blocked CDN
// makes OCR hang indefinitely with no error) — self-hosting the worker/core here, copied fresh
// from node_modules on every install, removes it. The English language data has no node_modules
// source, so it's committed directly under public/tesseract/ instead (see that directory).
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'public', 'tesseract');
fs.mkdirSync(targetDir, { recursive: true });

fs.copyFileSync(
  path.join(__dirname, '..', 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'),
  path.join(targetDir, 'worker.min.js'),
);

const coreDir = path.join(__dirname, '..', 'node_modules', 'tesseract.js-core');
for (const fileName of ['tesseract-core.wasm.js', 'tesseract-core.wasm']) {
  fs.copyFileSync(path.join(coreDir, fileName), path.join(targetDir, fileName));
}

console.log('Copied tesseract.js browser assets to public/tesseract/');
