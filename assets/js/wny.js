/* Western New York MAG — front page and all-articles list.
 *
 * data/wny.json is exported from niagaraassembly/na-research by
 * scripts/wny/export.py. The export admits only records that passed review
 * (publish_status approved or published). This module checks again before
 * rendering, so a hand-edited or stale file still cannot surface a record
 * that has not been approved.
 *
 * WNY is defined in atlas/GLOSSARY.md. For now the MAG admits any approved
 * New York State record; the corridor line shows only those that fall
 * between the Niagara River and Syracuse.
 */

import { escapeHtml, safeHttpUrl } from './escape.js';

export const RECENT_LIMIT = 5;
export const PUBLISHABLE = new Set(['approved', 'published']);

/* na-research's controlled event types (research/news/schema/
   controlled-values.json), grouped into the front page's sections. A type
   missing here falls into "Other news" rather than vanishing. */
export const GROUPS = [
  { id: 'investment', label: 'Investment and deals', types: [
    'capital_investment', 'equipment_investment', 'funding_round', 'grant_or_incentive',
    'acquisition', 'divestiture', 'ownership_change', 'major_contract', 'production_partnership'] },
  { id: 'facilities', label: 'Facilities', types: [
    'facility_opening', 'facility_expansion', 'facility_closure', 'manufacturing_capacity'] },
  { id: 'jobs', label: 'Jobs', types: [
    'workforce_expansion', 'layoff', 'bankruptcy_or_restructuring'] },
  { id: 'ventures', label: 'New ventures', types: [
    'startup_formation', 'research_commercialization', 'product_or_process_launch', 'certification'] },
  { id: 'other', label: 'Other news', types: ['other_material_update'] },
];

const TYPE_LABELS = {
  capital_investment: 'Capital investment', equipment_investment: 'Equipment',
  funding_round: 'Funding round', grant_or_incentive: 'Grant',
  acquisition: 'Acquisition', divestiture: 'Divestiture', ownership_change: 'Ownership change',
  major_contract: 'Contract', production_partnership: 'Partnership',
  facility_opening: 'Opening', facility_expansion: 'Expansion', facility_closure: 'Closure',
  manufacturing_capacity: 'Capacity', workforce_expansion: 'Hiring', layoff: 'Layoffs',
  bankruptcy_or_restructuring: 'Restructuring', startup_formation: 'Startup',
  research_commercialization: 'Commercialization', product_or_process_launch: 'Launch',
  certification: 'Certification', other_material_update: 'Update',
};

/* The corridor runs from the Niagara River to Syracuse, west to east.
   Longitudes are the line's ends; towns are the ticks drawn on it.
   Niagara Falls is not labelled: it is 0.17° from Buffalo, and the two
   names collide at every width. Its stories are still marked. */
export const CORRIDOR = {
  west: -79.1,
  east: -76.0,
  towns: [
    { name: 'Buffalo', lng: -78.88 },
    { name: 'Rochester', lng: -77.61 },
    { name: 'Syracuse', lng: -76.15 },
  ],
};

export function groupFor(type) {
  return (GROUPS.find((g) => g.types.includes(type)) ?? GROUPS.at(-1)).id;
}

export function typeLabel(type) {
  return TYPE_LABELS[type] ?? 'Update';
}

export function publishable(items) {
  return (items ?? []).filter((item) => PUBLISHABLE.has(item.publish_status));
}

/** Newest first; items sharing a date keep their order in the data. */
export function byNewest(items) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => String(b.item.date ?? '').localeCompare(String(a.item.date ?? '')) || a.index - b.index)
    .map(({ item }) => item);
}

/** Position along the corridor, 0 (Niagara River) to 1 (Syracuse); null if off the line. */
export function corridorPosition(lng, corridor = CORRIDOR) {
  if (typeof lng !== 'number' || Number.isNaN(lng)) return null;
  if (lng < corridor.west || lng > corridor.east) return null;
  return (lng - corridor.west) / (corridor.east - corridor.west);
}

/** "$49M", "$20.7B", "C$500K". Empty when there is no amount. */
export function formatAmount(amount, currency) {
  const n = Number(amount);
  if (!amount || !Number.isFinite(n) || n <= 0) return '';
  const symbol = currency === 'CAD' ? 'C$' : currency === 'USD' || !currency ? '$' : `${currency} `;
  const [div, suffix] = n >= 1e9 ? [1e9, 'B'] : n >= 1e6 ? [1e6, 'M'] : n >= 1e3 ? [1e3, 'K'] : [1, ''];
  const value = n / div;
  return `${symbol}${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, '')}${suffix}`;
}

function formatDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Companies named in approved items, most-mentioned first, then by name. */
export function companiesInNews(items, entities) {
  const byId = new Map((entities ?? []).map((e) => [e.id, e]));
  const counts = new Map();
  for (const item of items) {
    if (!item.entity_id) continue;
    counts.set(item.entity_id, (counts.get(item.entity_id) ?? 0) + 1);
  }
  return [...counts]
    .map(([id, count]) => ({ ...(byId.get(id) ?? { id, name: items.find((i) => i.entity_id === id)?.entity_name }), count }))
    .filter((e) => e.name)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function renderItem(item, { showType = true, showAmount = false, compact = false } = {}) {
  const source = (item.sources ?? []).map((s) => ({ ...s, url: safeHttpUrl(s.url) })).find((s) => s.url);
  const amount = showAmount ? formatAmount(item.amount, item.currency) : '';
  const title = source
    ? `<a class="issue-list__title" href="${escapeHtml(source.url)}" rel="noopener">${escapeHtml(item.headline)}</a>`
    : `<span class="issue-list__title">${escapeHtml(item.headline)}</span>`;
  const meta = [showType ? typeLabel(item.type) : '', formatDate(item.date), item.place, item.entity_name]
    .filter(Boolean).map(escapeHtml).join(' · ');
  const via = source?.publisher ? `<p class="wny-item__via">Source: ${escapeHtml(source.publisher)}</p>` : '';
  if (compact) {
    return `<li class="issue-list__item wny-item wny-item--compact" data-item="${escapeHtml(item.id)}">`
      + title + `<p class="issue-list__meta">${meta}</p></li>`;
  }
  return `<li class="issue-list__item wny-item" id="wny-${escapeHtml(item.id)}" data-item="${escapeHtml(item.id)}">`
    + (amount ? `<p class="wny-item__amount">${escapeHtml(amount)}</p>` : '')
    + title
    + `<p class="issue-list__meta">${meta}</p>`
    + (item.summary ? `<p class="wny-item__summary">${escapeHtml(item.summary)}</p>` : '')
    + (item.note ? `<p class="wny-item__note">Note: ${escapeHtml(item.note)}</p>` : '')
    + via
    + '</li>';
}

export function renderCompanies(companies) {
  return companies.map((c) => {
    const url = safeHttpUrl(c.website);
    const name = url
      ? `<a href="${escapeHtml(url)}" rel="noopener">${escapeHtml(c.name)}</a>`
      : escapeHtml(c.name);
    const count = `${c.count} ${c.count === 1 ? 'story' : 'stories'}`;
    return `<li class="wny-company"><span class="wny-company__name">${name}</span>`
      + `<span class="wny-company__meta">${[c.city, count].filter(Boolean).map(escapeHtml).join(' · ')}</span></li>`;
  }).join('');
}

/* ---- corridor line ------------------------------------------------------ */

const SVG_NS = 'http://www.w3.org/2000/svg';
const SEED = 1979;  /* fixed, like sketch.js: the line's wobble must not re-roll on redraw */

/** Spread marks that share a place so each stays reachable. */
export function corridorMarks(items, corridor = CORRIDOR) {
  const marks = [];
  for (const item of items) {
    const x = corridorPosition(item.lng, corridor);
    if (x === null) continue;
    const stack = marks.filter((m) => Math.abs(m.x - x) < 0.015).length;
    marks.push({ id: item.id, x, stack, item });
  }
  return marks;
}

function drawCorridor(root, items) {
  const svg = root.querySelector('.corridor__line');
  const marksEl = root.querySelector('.corridor__marks');
  const caption = root.querySelector('.corridor__caption');
  if (!svg || !marksEl) return;
  const marks = corridorMarks(items);
  /* With no stories at all the page-level note speaks; the caption stays quiet. */
  const defaultCaption = marks.length
    ? `${marks.length} approved ${marks.length === 1 ? 'story' : 'stories'} between the Niagara River and Syracuse.`
    : items.length ? 'None of the approved stories fall between the Niagara River and Syracuse.' : '';

  const draw = () => {
    const w = svg.clientWidth || 600;
    const h = 64, y = 30, pad = 8;
    const span = w - pad * 2;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = typeof rough !== 'undefined' ? rough.svg(svg) : null;
    const opts = { stroke: 'currentColor', strokeWidth: 1.4, roughness: 0.7, bowing: 0.45, seed: SEED };
    const line = (x1, y1, x2, y2, o = {}) => {
      if (rc) { svg.appendChild(rc.line(x1, y1, x2, y2, { ...opts, ...o })); return; }
      const l = document.createElementNS(SVG_NS, 'line');
      Object.entries({ x1, y1, x2, y2, stroke: 'currentColor', 'stroke-width': 1.4 }).forEach(([k, v]) => l.setAttribute(k, v));
      svg.appendChild(l);
    };
    line(pad, y, w - pad, y);
    for (const [i, town] of CORRIDOR.towns.entries()) {
      const x = pad + corridorPosition(town.lng) * span;
      line(x, y - 7, x, y + 7, { seed: SEED + i + 1 });
    }
    for (const [i, m] of marks.entries()) {
      const cx = pad + m.x * span, cy = y - 14 - m.stack * 11;
      if (rc) svg.appendChild(rc.circle(cx, cy, 9, { ...opts, seed: SEED + 50 + i, fill: 'currentColor', fillStyle: 'solid' }));
      else {
        const c = document.createElementNS(SVG_NS, 'circle');
        Object.entries({ cx, cy, r: 4.5, fill: 'currentColor' }).forEach(([k, v]) => c.setAttribute(k, v));
        svg.appendChild(c);
      }
    }
  };

  /* Town labels and focusable marks are HTML laid over the drawing. */
  const labels = root.querySelector('.corridor__towns');
  if (labels) {
    labels.innerHTML = CORRIDOR.towns.map((t) =>
      `<span style="left:${(corridorPosition(t.lng) * 100).toFixed(2)}%">${escapeHtml(t.name)}</span>`).join('');
  }
  marksEl.innerHTML = marks.map((m) =>
    `<a class="corridor__mark" href="#wny-${escapeHtml(m.id)}" data-item="${escapeHtml(m.id)}"`
    + ` style="left:${(m.x * 100).toFixed(2)}%;bottom:${34 + m.stack * 11}px"`
    + ` aria-label="${escapeHtml(`${m.item.place}: ${m.item.headline}`)}"></a>`).join('');
  if (caption) caption.textContent = defaultCaption;

  draw();
  if (typeof ResizeObserver !== 'undefined') {
    let pending = false;
    new ResizeObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; draw(); });
    }).observe(svg);
  }

  /* Mark and story highlight each other; the caption names what is pointed at. */
  const byId = new Map(items.map((i) => [i.id, i]));
  const setActive = (id) => {
    document.querySelectorAll('[data-item].is-pointed').forEach((el) => el.classList.remove('is-pointed'));
    if (!id) { if (caption) caption.textContent = defaultCaption; return; }
    document.querySelectorAll(`[data-item="${CSS.escape(id)}"]`).forEach((el) => el.classList.add('is-pointed'));
    const item = byId.get(id);
    if (caption && item) caption.textContent = `${item.place}: ${item.headline}`;
  };
  const target = (e) => e.target.closest?.('[data-item]')?.dataset.item;
  document.addEventListener('pointerover', (e) => setActive(target(e)));
  document.addEventListener('focusin', (e) => setActive(target(e)));
  document.addEventListener('focusout', () => setActive(null));
}

/* ---- mounting ------------------------------------------------------------ */

/* The fictional sample file is for previewing the design on a local server
   only. It is never loaded on the published site. */
function dataUrl() {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  return local && new URLSearchParams(location.search).has('sample')
    ? '/tests/fixtures/wny-sample.json'
    : '/data/wny.json';
}

async function loadData() {
  const res = await fetch(dataUrl(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function show(el, html) {
  if (!el) return;
  if (html !== undefined) el.innerHTML = html;
  el.hidden = false;
}

export async function mountFront(root = document) {
  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error('wny.json failed to load', err);
    show(root.querySelector('[data-wny="error"]'));
    return;
  }
  const items = byNewest(publishable(data.items));
  drawCorridor(root, items);

  if (!items.length) {
    show(root.querySelector('[data-wny="empty"]'));
  } else {
    show(root.querySelector('[data-wny="recent"]'));
    show(root.querySelector('[data-wny="recent-list"]'),
      items.slice(0, RECENT_LIMIT).map((i) => renderItem(i, { compact: true })).join(''));
    for (const group of GROUPS) {
      const section = root.querySelector(`[data-wny-group="${group.id}"]`);
      const inGroup = items.filter((i) => groupFor(i.type) === group.id);
      if (!section || !inGroup.length) continue;
      show(section.querySelector('ul'), inGroup.map((i) =>
        renderItem(i, { showAmount: group.id === 'investment' })).join(''));
      show(section);
    }
    const companies = companiesInNews(items, data.entities);
    if (companies.length) {
      show(root.querySelector('[data-wny="companies-list"]'), renderCompanies(companies));
      show(root.querySelector('[data-wny="companies"]'));
    }
  }
  updated(root, data);
  window.NASketch?.redraw();
}

export async function mountAll(root = document) {
  const list = root.querySelector('[data-wny="all"]');
  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error('wny.json failed to load', err);
    show(root.querySelector('[data-wny="error"]'));
    return;
  }
  const items = byNewest(publishable(data.items));
  if (!items.length) show(root.querySelector('[data-wny="empty"]'));
  else show(list, items.map((i) => renderItem(i, { showAmount: groupFor(i.type) === 'investment' })).join(''));
  updated(root, data);
}

function updated(root, data) {
  const el = root.querySelector('[data-wny="updated"]');
  const when = data.generated_at ? formatDate(String(data.generated_at).slice(0, 10)) : '';
  if (el && when) show(el, `Updated ${escapeHtml(when)} from reviewed Niagara Assembly research.`);
}
