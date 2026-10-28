import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const tag = '<script src="/high-school-blank-translation-quiz/quiz-result-recorder.js?v=20261027-1" defer></script>';
const files = execFileSync('rg', ['--files', '-g', '*.html'], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean);
let changed = 0;
for (const file of files) {
  let html = await readFile(file, 'utf8');
  if (html.includes('quiz-result-recorder.js') || !/<\/body>/i.test(html)) continue;
  html = html.replace(/<\/body>/i, `${tag}</body>`);
  await writeFile(file, html, 'utf8');
  changed++;
}
console.log(`Injected quiz result recorder into ${changed} HTML files.`);
