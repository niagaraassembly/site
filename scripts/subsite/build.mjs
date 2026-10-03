import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCorpus } from './model.mjs';
import { MARKER, pages } from './render.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

export function build(repoRoot = root) {
  const corpus = loadCorpus(repoRoot);
  const planned = pages(corpus);
  const keep = new Set(planned.map((item) => item.path));
  for (const item of planned) {
    const dest = path.join(repoRoot, item.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, item.html);
  }
  for (const rel of generatedFiles(repoRoot)) {
    if (!keep.has(rel)) fs.rmSync(path.join(repoRoot, rel));
  }
  return { written: planned.map((item) => item.path), drafts: corpus.pieces.filter((piece) => piece.data.status !== 'published').map((piece) => piece.file) };
}

function generatedFiles(repoRoot) {
  const found = [];
  for (const dir of ['site', 'pieces']) {
    walk(path.join(repoRoot, dir), repoRoot, found);
  }
  return found;
}

function walk(dir, repoRoot, found) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, repoRoot, found);
    else if (entry.name === 'index.html') {
      const text = fs.readFileSync(abs, 'utf8');
      if (text.includes(MARKER)) found.push(path.relative(repoRoot, abs));
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = build();
  console.log(`wrote ${result.written.length} pages`);
  console.log(`withheld ${result.drafts.length} non-published pieces`);
}
