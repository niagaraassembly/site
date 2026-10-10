/* Sources pages: every root domain the published research cites.
 *
 * An issue's page (data-sources-file) lists the domains behind that issue;
 * /research/sources/ (data-sources-all) combines the latest data of every
 * MAG in data/mags.json, so the collection grows as MAGs are added. Only
 * published material is read: story sources, the sources behind conflicting
 * values, and the sources for people named.
 */

import { escapeHtml, safeHttpUrl } from './escape.js';

/* Second-level labels under a country code (e.g. bbc.co.uk) that are not
   registrable on their own. */
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'ac', 'edu']);

/** The registrable root of a host: "finance.yahoo.com" -> "yahoo.com",
    "www.governor.ny.gov" -> "ny.gov", "news.bbc.co.uk" -> "bbc.co.uk". */
export function rootDomain(host) {
  const parts = String(host ?? '').toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const [sld, tld] = parts.slice(-2);
  return tld.length === 2 && SECOND_LEVEL.has(sld) ? parts.slice(-3).join('.') : parts.slice(-2).join('.');
}

const KIND = { primary: 'primary source', company: 'company source', secondary: 'news report' };

/** Every cited URL in a data file, with who published it and which story. */
export function citations(data) {
  const out = [];
  const byId = new Map((data.items ?? []).map((i) => [i.id, i]));
  for (const item of data.items ?? []) {
    for (const s of item.sources ?? []) out.push({ url: s.url, publisher: s.publisher, kind: s.kind, item });
    for (const c of item.conflicts ?? []) for (const v of c.values ?? []) out.push({ url: v.url, publisher: v.source, item });
  }
  for (const p of data.people ?? []) {
    const item = byId.get(p.event_id);
    if (item) out.push({ url: p.url, publisher: p.source, item });
  }
  return out.filter((c) => safeHttpUrl(c.url));
}

/** Citations grouped by root domain, most-cited first. */
export function sourcesIndex(entries) {
  const roots = new Map();
  for (const { url, publisher, kind, item, mag } of entries) {
    const root = rootDomain(new URL(url).hostname);
    const r = roots.get(root) ?? { root, publishers: new Set(), kinds: new Set(), stories: new Map(), mags: new Set() };
    if (publisher) r.publishers.add(publisher);
    if (kind && KIND[kind]) r.kinds.add(KIND[kind]);
    r.stories.set(`${mag?.id ?? ''}:${item.id}`, { item, mag });
    if (mag) r.mags.add(mag.name);
    roots.set(root, r);
  }
  return [...roots.values()].sort((a, b) => b.stories.size - a.stories.size || a.root.localeCompare(b.root));
}

export function renderSources(index, { storyHref = (s) => `#wny-${s.item.id}`, showMags = false } = {}) {
  return index.map((r) => {
    const stories = [...r.stories.values()].map((s) =>
      `<a href="${escapeHtml(storyHref(s))}">${escapeHtml(s.item.headline)}</a>`).join('; ');
    return `<tr><td class="sources__root">${escapeHtml(r.root)}</td>`
      + `<td>${[...r.publishers].map(escapeHtml).join(', ')}</td>`
      + `<td>${[...r.kinds].map(escapeHtml).join(', ')}</td>`
      + (showMags ? `<td>${[...r.mags].map(escapeHtml).join(', ')}</td>` : '')
      + `<td><span class="sources__count">${r.stories.size}</span> ${stories}</td></tr>`;
  }).join('');
}

async function json(path) {
  if (!/^\/data\/[\w/-]+\.json$/.test(path)) throw new Error(`refused ${path}`);
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

export async function mountSources(root = document) {
  const table = root.querySelector('[data-sources-file], [data-sources-all]');
  if (!table) return;
  const body = table.querySelector('tbody');
  const count = root.querySelector('[data-sources-count]');
  try {
    let index, opts = {};
    if (table.hasAttribute('data-sources-file')) {
      const data = await json(table.getAttribute('data-sources-file'));
      const base = table.getAttribute('data-stories-page') ?? '';
      index = sourcesIndex(citations(data));
      opts = { storyHref: (s) => `${base}#wny-${s.item.id}` };
    } else {
      const registry = await json('/data/mags.json');
      const entries = [];
      for (const mag of registry.mags ?? []) {
        if (!mag.data) continue;
        const data = await json(mag.data);
        for (const c of citations(data)) entries.push({ ...c, mag });
      }
      index = sourcesIndex(entries);
      /* Stories link to their card on the MAG's all-articles page. */
      opts = { showMags: true, storyHref: (s) => `${s.mag.href}posts/#wny-${s.item.id}` };
    }
    body.innerHTML = renderSources(index, opts);
    if (count) count.textContent = `${index.length} ${index.length === 1 ? 'source domain' : 'source domains'}`;
    table.hidden = false;
  } catch (err) {
    console.error('sources failed to load', err);
    if (count) count.textContent = 'The sources didn’t load. Reload the page to try again.';
  }
}

if (typeof document !== 'undefined') mountSources();
