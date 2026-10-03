import { escapeHtml, safeHttpUrl } from '../../assets/js/escape.js';

const KINDS = {
  note: 'Note',
  quote: 'Quote',
  definition: 'Definition',
  figure: 'Figure',
  deeper: 'Go deeper',
};

/** Body headings start at h2. The page h1 is the front-matter title. */
const HEADING = { 1: 'h2', 2: 'h3', 3: 'h4' };

export function renderBody(markdown, ctx) {
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    if (line.startsWith(':::')) {
      const spec = line.trim().slice(3).trim();
      const space = spec.indexOf(' ');
      const kind = space === -1 ? spec : spec.slice(0, space);
      const arg = space === -1 ? '' : spec.slice(space + 1).trim();
      if (!KINDS[kind]) throw new Error(`unknown margin kind ::: ${kind || '(empty)'}`);
      const bodyLines = [];
      i++;
      let closed = false;
      while (i < lines.length) {
        if (lines[i].trim() === ':::') { closed = true; i++; break; }
        bodyLines.push(lines[i]);
        i++;
      }
      if (!closed) throw new Error(`unclosed margin fence ::: ${kind}`);
      blocks.push({ type: 'margin', kind, arg, body: bodyLines.join('\n').trim() });
      continue;
    }
    const heading = line.match(/^(#{1,3}) (.+)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }
    if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith(':::') &&
      !lines[i].startsWith('- ') &&
      !/^#{1,3} /.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'paragraph', text: para.join(' ') });
  }

  const state = { n: 1 };
  return blocks.map((block) => renderBlock(block, ctx, state)).join('\n');
}

function renderBlock(block, ctx, state) {
  if (block.type === 'heading') {
    const tag = HEADING[block.level];
    return `<${tag}>${inline(block.text)}</${tag}>`;
  }
  if (block.type === 'list') {
    const items = block.items.map((item) => `<li>${inline(item)}</li>`).join('\n');
    return `<ul class="plain">\n${items}\n</ul>`;
  }
  if (block.type === 'paragraph') return `<p>${inline(block.text)}</p>`;
  return renderMargin(block, ctx, state);
}

function renderMargin(block, ctx, state) {
  const id = `m-${state.n++}`;
  let inner = '';
  if (block.kind === 'definition') {
    const term = ctx.glossary.get(block.arg);
    if (!term) throw new Error(`unknown glossary id "${block.arg}"`);
    if (!termApplies(term, ctx.regionIds)) {
      throw new Error(`glossary id "${block.arg}" is not defined for this subsite`);
    }
    inner = `<p><b>${escapeHtml(term.term)}</b></p>\n<p>${escapeHtml(term.definition)}</p>`;
  } else if (block.kind === 'figure') {
    const fields = fenceFields(block.body);
    const src = safeAsset(fields.src);
    if (!src) throw new Error('a figure needs a root-relative or https src');
    if (!fields.alt) throw new Error('a figure needs alt text');
    inner = `<img src="${escapeHtml(src)}" alt="${escapeHtml(fields.alt)}">`;
    if (fields.caption) inner += `\n<p>${inline(fields.caption)}</p>`;
  } else if (block.kind === 'deeper') {
    const fields = fenceFields(block.body);
    const href = safeLink(fields.href);
    if (!href) throw new Error('a go-deeper item needs an href');
    const label = fields.label || 'Technical piece';
    inner = `<p><a href="${escapeHtml(href)}">${inline(label)}</a></p>`;
  } else {
    inner = paragraphs(block.body);
  }
  return `<aside class="margin-item" id="${id}" data-kind="${block.kind}">\n<p class="margin-item__kind">${KINDS[block.kind]}</p>\n${inner}\n</aside>`;
}

function termApplies(term, regionIds) {
  if (!term.regions || term.regions.length === 0) return true;
  return term.regions.some((id) => regionIds.includes(id));
}

function fenceFields(body) {
  const out = {};
  for (const line of body.split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^([A-Za-z][A-Za-z0-9]*):\s+(.*)$/);
    if (!m) throw new Error(`bad margin field "${line.trim()}"`);
    out[m[1]] = m[2].trim();
  }
  return out;
}

function paragraphs(body) {
  if (!body.trim()) return '';
  return body.split(/\n\s*\n/).map((part) => `<p>${inline(part.replace(/\n/g, ' ').trim())}</p>`).join('\n');
}

export function inline(text) {
  let out = '';
  let i = 0;
  const s = String(text);
  while (i < s.length) {
    if (s.startsWith('**', i)) {
      const close = s.indexOf('**', i + 2);
      if (close !== -1) {
        out += `<b>${inline(s.slice(i + 2, close))}</b>`;
        i = close + 2;
        continue;
      }
    }
    if (s[i] === '*' && s[i + 1] !== '*') {
      const close = s.indexOf('*', i + 1);
      if (close !== -1) {
        out += `<i>${inline(s.slice(i + 1, close))}</i>`;
        i = close + 1;
        continue;
      }
    }
    if (s[i] === '[') {
      const labelEnd = s.indexOf(']', i + 1);
      if (labelEnd !== -1 && s[labelEnd + 1] === '(') {
        const hrefEnd = s.indexOf(')', labelEnd + 2);
        if (hrefEnd !== -1) {
          const label = s.slice(i + 1, labelEnd);
          const href = safeLink(s.slice(labelEnd + 2, hrefEnd).trim());
          out += href
            ? `<a href="${escapeHtml(href)}">${inline(label)}</a>`
            : inline(label);
          i = hrefEnd + 1;
          continue;
        }
      }
    }
    out += escapeHtml(s[i]);
    i++;
  }
  return out;
}

function safeAsset(src) {
  return safeLink(src);
}

export function safeLink(url) {
  const value = String(url ?? '').trim();
  if (value.startsWith('/')) {
    if (value.startsWith('//')) return null;
    if (!/^\/[A-Za-z0-9/._~-]*$/.test(value)) return null;
    return value;
  }
  return safeHttpUrl(value);
}
