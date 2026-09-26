// Production build: bundles every ES module into one minified script and inlines it
// into index.html, producing a single self-contained file (dist/ultimo-lume.html)
// that runs from disk or any static host. Usage: `npm run build`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist');
const outFile = path.join(outDir, 'ultimo-lume.html');

const result = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2020',
  legalComments: 'none',
  write: false,
});
// a literal "</script" inside the bundle would end the inline <script> early
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tag = '<script type="module" src="src/main.js"></script>';
if (!html.includes(tag)) throw new Error('index.html: entry <script> tag not found');
const out = html.replace(tag, () => `<script>${js}</script>`);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, out);
console.log(`dist/ultimo-lume.html  ${(Buffer.byteLength(out) / 1024).toFixed(1)} KB`);
