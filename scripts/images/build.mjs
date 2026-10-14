/* Builds data/images.json: every image the site shows, with where it
 * appears and who made it.
 *
 *   node scripts/images/build.mjs          write data/images.json
 *   node scripts/images/build.mjs --check  exit 1 if the file is stale
 *
 * Sources, in order:
 *   1. Magazine articles: every <img> inside .article in
 *      MAGS/<MAG>/<issue>/<article>/index.html, or MAGS/<MAG>/<article>/
 *      for magazines without issues. The figcaption is the credit.
 *   2. assets/img/home/credits.json (homepage) and
 *      assets/img/desks/credits.json (desk cards).
 *
 * So an image gets into the gallery by being published in an article; no
 * one has to remember to register it. tests/images.test.mjs runs --check.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, 'data/images.json');

const MAGAZINES = { START: 'START', RESEARCH: 'Research' };

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', middot: '·', hellip: '…', times: '×', rarr: '→', larr: '←' };
const decode = (s) => s.replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e] ?? m);
const text = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => decode(tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1] ?? '');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === 'index.html') out.push(p);
  }
  return out;
}

/* Wikimedia originals are megabytes; their thumbnail service gives the
   same picture at a width the grid can use. Only some widths are served
   (2026-10-14: 250, 330, 500, 960, 1280 return 200; 640 and 800 return 400). */
export function thumbFor(src, width = 500) {
  const m = src.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)$/);
  return m ? `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${m[3]}/${width}px-${m[3]}` : src;
}

const urlFor = (file) => `/${relative(ROOT, file).split(sep).join('/').replace(/index\.html$/, '')}`;

function issueTitle(dir) {
  const file = join(dir, 'index.html');
  if (!existsSync(file)) return '';
  return text(readFileSync(file, 'utf8').match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '');
}

export function articleImages() {
  const out = [];
  for (const mag of Object.keys(MAGAZINES)) {
    const base = join(ROOT, 'MAGS', mag);
    if (!existsSync(base)) continue;
    for (const file of walk(base).sort()) {
      const html = readFileSync(file, 'utf8');
      const article = html.match(/<div class="article"[^>]*>([\s\S]*)/)?.[1];
      if (!article) continue;
      const title = text(article.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '');
      const parts = relative(base, file).split(sep);   // [issue?, article, 'index.html']
      const issueDir = parts.length === 3 ? join(base, parts[0]) : null;
      const figures = [...article.matchAll(/<figure[^>]*>([\s\S]*?)<\/figure>|(<img\b[^>]*>)/g)];
      for (const f of figures) {
        const body = f[1] ?? f[2];
        const img = body.match(/<img\b[^>]*>/)?.[0];
        if (!img) continue;
        const src = attr(img, 'src');
        out.push({
          src,
          thumb: thumbFor(src),
          alt: attr(img, 'alt'),
          width: Number(attr(img, 'width')) || null,
          height: Number(attr(img, 'height')) || null,
          credit: text(body.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/)?.[1] ?? ''),
          source: body.match(/<figcaption[\s\S]*?href="([^"]+)"/)?.[1] ?? '',
          section: 'Magazines',
          magazine: MAGAZINES[mag],
          issue: issueDir ? issueTitle(issueDir) : '',
          issue_href: issueDir ? urlFor(join(issueDir, 'index.html')) : '',
          article: title,
          article_href: urlFor(file)
        });
      }
    }
  }
  return out;
}

/* Desk card images link to their desk, found by name in the registry. */
const deskHref = (name) => JSON.parse(readFileSync(join(ROOT, 'data/desks.json'), 'utf8'))
  .desks.find((d) => d.name === name)?.href ?? '/desks/';

function creditImages(path, section) {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8')).map((c) => ({
    src: c.local,
    thumb: c.local,
    alt: c.title.replace(/\.[a-z]+$/i, ''),
    width: null,
    height: null,
    credit: [c.artist, c.license].filter(Boolean).join(', '),
    source: c.page,
    license_url: c.license_url,
    section,
    magazine: '',
    issue: '',
    issue_href: '',
    article: c.region,
    article_href: section === 'Homepage' ? '/' : deskHref(c.region)
  }));
}

export function build() {
  return [
    ...articleImages(),
    ...creditImages('assets/img/home/credits.json', 'Homepage'),
    ...creditImages('assets/img/desks/credits.json', 'Desks')
  ];
}

const serialise = (images) => `${JSON.stringify({ _note: 'Generated by scripts/images/build.mjs. Do not edit by hand.', images }, null, 2)}\n`;

export function isStale() {
  return !existsSync(OUT) || readFileSync(OUT, 'utf8') !== serialise(build());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--check')) {
    if (isStale()) { console.error('data/images.json is stale: run node scripts/images/build.mjs'); process.exit(1); }
    console.log('data/images.json is current');
  } else {
    const images = build();
    writeFileSync(OUT, serialise(images));
    console.log(`wrote ${images.length} images to data/images.json`);
  }
}
