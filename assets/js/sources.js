/* Sources pages: every root domain the published research cites.
 *
 * An issue's page (data-sources-file) lists the domains its published
 * stories cite: story sources, the sources behind conflicting values, and the
 * sources for people named.
 *
 * /research/sources/ (data-sources-registry) lists every source the research
 * draws on, from na-research's approved public source registry (exported to
 * data/sources.json), grouped by each source's most specific coverage. Each
 * row links the published stories that cite it, from every MAG's latest data
 * in data/mags.json.
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

/* ---- the public source registry -------------------------------------------- */

const ISO_NAMES = { US: 'United States', CA: 'Canada', 'US-NY': 'New York', 'US-PA': 'Pennsylvania', 'CA-ON': 'Ontario' };

export const TYPE_LABELS = {
  news: 'News', business_news: 'Business news', broadcast: 'Broadcast', newswire: 'Newswire',
  government: 'Government', regulatory_filings: 'Regulatory filings', economic_development: 'Economic development',
  company: 'Company', university: 'University', union: 'Union', industry_association: 'Industry association',
  procurement: 'Procurement', public_notices: 'Public notices', directory: 'Directory', aggregator: 'Aggregator', mirror: 'Mirror',
};
/* Shown with their type so readers can see they are not original publishers. */
export const NOT_ORIGINAL = new Set(['directory', 'aggregator', 'mirror']);

/** 0 region, 1 state or province, 2 country, 3 global. */
export function coverageRank(code, regions) {
  if (code === 'global') return 3;
  if (regions?.[code]) return 0;
  return /^[A-Z]{2}-[A-Z0-9]+$/.test(code) ? 1 : 2;
}

export function coverageLabel(code, regions) {
  if (code === 'global') return 'Global';
  return regions?.[code] ?? ISO_NAMES[code] ?? code;
}

/** Sources grouped under their most specific coverage, most specific groups first. */
export function groupRegistry(sources, regions) {
  const groups = new Map();
  for (const src of sources ?? []) {
    const codes = src.coverage?.length ? src.coverage : ['global'];
    const home = [...codes].sort((a, b) => coverageRank(a, regions) - coverageRank(b, regions))[0];
    const g = groups.get(home) ?? { code: home, label: coverageLabel(home, regions), rank: coverageRank(home, regions), sources: [] };
    g.sources.push({ ...src, also: codes.filter((c) => c !== home).map((c) => coverageLabel(c, regions)) });
    groups.set(home, g);
  }
  return [...groups.values()]
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
    .map((g) => ({ ...g, sources: g.sources.sort((a, b) => Number(b.cited) - Number(a.cited) || a.name.localeCompare(b.name)) }));
}

export function renderRegistry(groups, citedIndex = new Map()) {
  return groups.map((g) => {
    const rows = g.sources.map((src) => {
      const stories = citedIndex.get(rootDomain(src.domain));
      const cited = stories?.length
        ? stories.map((st) => `<a href="${escapeHtml(st.href)}">${escapeHtml(st.headline)}</a>`).join('; ')
        : (src.cited ? 'Cited' : '');
      const type = (TYPE_LABELS[src.type] ?? src.type)
        + (NOT_ORIGINAL.has(src.type) ? ' <span class="sources__note">(not an original publisher)</span>' : '');
      return `<tr><td>${escapeHtml(src.name)}</td><td class="sources__root">${escapeHtml(src.domain)}</td>`
        + `<td>${type}</td><td>${src.also.map(escapeHtml).join(', ')}</td><td>${cited}</td></tr>`;
    }).join('');
    return `<h2 class="sources__group">${escapeHtml(g.label)} <span class="sources__n">${g.sources.length}</span></h2>`
      + `<table class="data sources"><thead><tr><th>Source</th><th>Domain</th><th>Type</th><th>Also covers</th>`
      + `<th>Cited in our stories</th></tr></thead><tbody>${rows}</tbody></table>`;
  }).join('');
}

async function json(path) {
  if (!/^\/data\/[\w/-]+\.json$/.test(path)) throw new Error(`refused ${path}`);
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

/** Published stories citing each root domain, across every MAG's latest data. */
async function citedIndex() {
  const out = new Map();
  const mags = await json('/data/mags.json');
  for (const mag of mags.mags ?? []) {
    if (!mag.data) continue;
    for (const c of citations(await json(mag.data))) {
      const root = rootDomain(new URL(c.url).hostname);
      const list = out.get(root) ?? [];
      if (!list.some((x) => x.id === c.item.id)) list.push({ id: c.item.id, headline: c.item.headline, href: `${mag.href}posts/#wny-${c.item.id}` });
      out.set(root, list);
    }
  }
  return out;
}

async function mountRegistry(el) {
  const count = document.querySelector('[data-sources-count]');
  try {
    const reg = await json('/data/sources.json');
    const groups = groupRegistry(reg.sources, reg.regions);
    let cited = new Map();
    try { cited = await citedIndex(); } catch (err) { console.error('story citations failed to load', err); }
    el.innerHTML = renderRegistry(groups, cited);
    const n = reg.sources.length, c = reg.sources.filter((x) => x.cited).length;
    if (count) count.textContent = `${n} sources · ${c} cited in published stories`;
    el.hidden = false;
  } catch (err) {
    console.error('sources.json failed to load', err);
    if (count) count.textContent = 'The sources didn’t load. Reload the page to try again.';
  }
}

export async function mountSources(root = document) {
  const registry = root.querySelector('[data-sources-registry]');
  if (registry) { await mountRegistry(registry); return; }
  const table = root.querySelector('[data-sources-file]');
  if (!table) return;
  const body = table.querySelector('tbody');
  const count = root.querySelector('[data-sources-count]');
  try {
    let index, opts = {};
    {
      const data = await json(table.getAttribute('data-sources-file'));
      const base = table.getAttribute('data-stories-page') ?? '';
      index = sourcesIndex(citations(data));
      opts = { storyHref: (s) => `${base}#wny-${s.item.id}` };
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
