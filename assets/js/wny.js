/* Western New York MAG — front page and all-articles list.
 *
 * data/wny.json is exported from niagaraassembly/na-research by
 * scripts/wny/export.py, following na-research's
 * research/routines/WNY-NEWS-SITE-STATE-MODEL.md. Every item, tag and
 * explainer comes from that file. This module adds only fixed wording keyed
 * by the controlled vocabularies (lanes, stages, flag types), as the state
 * model specifies.
 *
 * publish_status is the editorial gate: only approved or published items
 * render, checked here as well as in the export. lane "excluded" never
 * renders.
 */

import { escapeHtml, safeHttpUrl } from './escape.js';

export const RECENT_LIMIT = 5;
export const PUBLISHABLE = new Set(['approved', 'published']);

/* Sections, by lane, in page order. The front page's section headings must
   match these labels (tested); lane "excluded" has no section and never
   renders. */
export const LANES = [
  { id: 'production', label: 'Investment and industry' },
  { id: 'developing', label: 'In development' },
  { id: 'corridor', label: 'Corridor news' },
];

export const STAGES = {
  intent: 'Stated intent', application: 'Application only', announced: 'Announced',
  approved_plan: 'Plan approved', award: 'Contract or award', under_way: 'Under way',
  completed: 'Completed', reported_only: 'Reported',
};

/* Flag types: a short name (filters; the methods page uses the same names)
   and one fixed sentence (story cards). {d} is the flag's detail in words. */
export const FLAGS = {
  conflict: { name: 'Sources disagree', tone: 'warn', text: 'Sources disagree on {d}' },
  gap: { name: 'Not disclosed', tone: 'plain', text: '{D} not disclosed' },
  follow_up: { name: 'Being confirmed', tone: 'plain', text: 'Being confirmed: {d}' },
  company_reported: { name: 'Company-reported', tone: 'info', text: 'Company-reported; not independently confirmed' },
  secondary_source: { name: 'Secondary listing', tone: 'plain', text: 'From a secondary listing; original notice not accessed' },
  ceiling_not_obligation: { name: 'Contract ceiling', tone: 'plain', text: 'Contract ceiling, not money committed or spent' },
  identity_unresolved: { name: 'Identity being confirmed', tone: 'warn', text: 'Company identity still being confirmed' },
  research_only: { name: 'Research funding', tone: 'info', text: 'Research funding, not a production or hiring commitment' },
  not_wny_production: { name: 'Not counted in production totals', tone: 'plain', text: 'Not counted in WNY production totals' },
};

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

const SOURCE_KINDS = { primary: 'primary source', company: 'company source', secondary: 'news report' };

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

export const words = (snake) => String(snake ?? '').replace(/_/g, ' ').trim();

export function typeLabel(type) {
  return TYPE_LABELS[type] ?? 'Update';
}

export function laneOf(item) {
  return LANES.some((l) => l.id === item.lane) ? item.lane : null;
}

/** Approved or published, in a known lane. Anything else stays off the page. */
export function publishable(items) {
  return (items ?? []).filter((item) => PUBLISHABLE.has(item.publish_status) && laneOf(item));
}

/** Newest first; items sharing a date keep their order in the data. */
export function byNewest(items) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => String(b.item.date ?? '').localeCompare(String(a.item.date ?? '')) || a.index - b.index)
    .map(({ item }) => item);
}

/** The reader's sentence for one flag; unknown types fall back to their own words. */
export function flagText(flag) {
  const rule = FLAGS[flag.type];
  const d = words(flag.detail);
  if (!rule) return { tone: 'plain', text: words(flag.type) };
  const text = rule.text
    .replace('{d}', d)
    .replace('{D}', d.charAt(0).toUpperCase() + d.slice(1));
  return { tone: rule.tone, text };
}

/** Figures for the money list: production items with a stated amount.
    amount is money committed or stated; a contract ceiling is a separate
    field (ceiling_amount) and never enters the list or a total. */
export function moneyLines(items) {
  return items.filter((i) => i.lane === 'production' && formatAmount(i.amount, i.currency));
}

/* Stages whose amounts are coloured: done (green) and only announced
   (dark yellow). Every other stage stays in ink. */
export const AMOUNT_TONES = { completed: 'done', announced: 'announced' };

const toneClass = (stage) => (AMOUNT_TONES[stage] ? ` wny-amount--${AMOUNT_TONES[stage]}` : '');

/** Sum of the money list, one total per currency (never mixed). */
export function moneyTotals(lines) {
  const totals = new Map();
  for (const i of lines) {
    const currency = i.currency || 'USD';
    totals.set(currency, (totals.get(currency) ?? 0) + Number(i.amount));
  }
  return [...totals].map(([currency, amount]) => ({ currency, amount }));
}

/** Each currency's total split by stage, stages in vocabulary order. */
export function moneyByStage(lines) {
  return moneyTotals(lines).map(({ currency, amount }) => {
    const parts = Object.keys(STAGES).concat('').map((stage) => ({
      stage,
      amount: lines.filter((i) => (i.currency || 'USD') === currency && (i.stage || '') === stage)
        .reduce((sum, i) => sum + Number(i.amount), 0),
    })).filter((part) => part.amount > 0);
    return { currency, amount, parts };
  });
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

/* ---- rendering ------------------------------------------------------------ */

const firstSource = (item) =>
  (item.sources ?? []).map((s) => ({ ...s, url: safeHttpUrl(s.url) })).find((s) => s.url);

function titleHtml(item) {
  const source = firstSource(item);
  return source
    ? `<a class="issue-list__title" href="${escapeHtml(source.url)}" rel="noopener">${escapeHtml(item.headline)}</a>`
    : `<span class="issue-list__title">${escapeHtml(item.headline)}</span>`;
}

function metaHtml(item) {
  return [typeLabel(item.type), formatDate(item.date), item.place, item.entity_name]
    .filter(Boolean).map(escapeHtml).join(' · ');
}

function stageHtml(item) {
  const label = STAGES[item.stage];
  return label ? `<span class="wny-stage">${escapeHtml(label)}</span>` : '';
}

function flagsHtml(item) {
  const flags = (item.flags ?? []).map(flagText);
  if (!flags.length) return '';
  return `<ul class="wny-flags">${flags.map((f) =>
    `<li class="wny-flag wny-flag--${f.tone}">${escapeHtml(f.text)}</li>`).join('')}</ul>`;
}

function conflictsHtml(item) {
  return (item.conflicts ?? []).map((c) => {
    const rows = (c.values ?? []).map((v) => {
      const url = safeHttpUrl(v.url);
      const source = v.source
        ? (url ? `<a href="${escapeHtml(url)}" rel="noopener">${escapeHtml(v.source)}</a>` : escapeHtml(v.source))
        : 'source not named';
      return `<li><span class="wny-conflict__value">${escapeHtml(v.value)}</span>`
        + `<span class="wny-conflict__source">${source}</span></li>`;
    });
    return rows.length
      ? `<div class="wny-conflict"><p class="wny-conflict__head">Sources disagree on ${escapeHtml(words(c.field))}</p><ul>${rows.join('')}</ul></div>`
      : '';
  }).join('');
}

function sourcesHtml(item) {
  const links = (item.sources ?? []).map((s) => {
    const url = safeHttpUrl(s.url);
    const name = s.publisher || s.title || 'Source';
    const kind = SOURCE_KINDS[s.kind] ? ` (${SOURCE_KINDS[s.kind]})` : '';
    return (url ? `<a href="${escapeHtml(url)}" rel="noopener">${escapeHtml(name)}</a>` : escapeHtml(name)) + escapeHtml(kind);
  });
  return links.length ? `<p class="wny-item__via">${links.length > 1 ? 'Sources' : 'Source'}: ${links.join('; ')}</p>` : '';
}

/** A full story card: stage, meta, headline, explainer, flags, conflicts, sources. */
export function renderItem(item) {
  const amount = formatAmount(item.amount, item.currency);
  const ceiling = formatAmount(item.ceiling_amount, item.currency);
  const money = amount || ceiling
    ? `<span class="wny-item__money">`
      + (amount ? `<span class="wny-item__amount${toneClass(item.stage)}">${escapeHtml(amount)}</span>`
        + (item.amount_type ? `<span class="wny-item__kind">${escapeHtml(words(item.amount_type))}</span>` : '') : '')
      + (ceiling ? `<span class="wny-item__ceiling">Contract ceiling ${escapeHtml(ceiling)}</span>` : '')
      + '</span>'
    : '';
  return `<li class="issue-list__item wny-item" id="wny-${escapeHtml(item.id)}" data-item="${escapeHtml(item.id)}">`
    + `<p class="wny-item__top">${stageHtml(item)}${money}</p>`
    + titleHtml(item)
    + `<p class="issue-list__meta">${metaHtml(item)}</p>`
    + (item.note ? `<p class="wny-item__note">${escapeHtml(item.note)}</p>` : '')
    + flagsHtml(item)
    + conflictsHtml(item)
    + sourcesHtml(item)
    + '</li>';
}

/** A one-line index entry, for Recent. No id, so it never duplicates the full card's. */
export function renderCompact(item) {
  return `<li class="issue-list__item wny-item wny-item--compact" data-item="${escapeHtml(item.id)}">`
    + titleHtml(item)
    + `<p class="issue-list__meta">${[STAGES[item.stage] ? escapeHtml(STAGES[item.stage]) : '', metaHtml(item)].filter(Boolean).join(' · ')}</p></li>`;
}

export function renderMoney(items) {
  return items.map((i) =>
    `<li class="wny-money__line" data-item="${escapeHtml(i.id)}">`
    + `<span class="wny-money__amount${toneClass(i.stage)}">${escapeHtml(formatAmount(i.amount, i.currency))}</span>`
    + `<a class="wny-money__what" href="#wny-${escapeHtml(i.id)}">${escapeHtml(i.headline)}</a>`
    + `<span class="wny-money__meta">${[STAGES[i.stage], words(i.amount_type), i.place].filter(Boolean).map(escapeHtml).join(' · ')}</span></li>`
  ).join('');
}

/** One line: each stage's subtotal in its colour, then the total. */
export function renderMoneyTotal(lines) {
  const sums = moneyByStage(lines).map(({ currency, amount, parts }) => {
    const pieces = parts.map((part) =>
      `<span class="wny-money__part"><b class="wny-money__sum${toneClass(part.stage)}">${escapeHtml(formatAmount(part.amount, currency))}</b>`
      + ` ${escapeHtml((STAGES[part.stage] ?? 'other').toLowerCase())}</span>`);
    return pieces.join(' + ')
      + (parts.length > 1 ? ` = <b class="wny-money__sum">${escapeHtml(formatAmount(amount, currency))}</b>` : '');
  });
  return `<span class="wny-money__label">Total of stated amounts</span>`
    + `<span class="wny-money__sums">${sums.join(' · ')}</span>`;
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
  const tallest = Math.max(0, ...marks.map((m) => m.stack));
  const h = 64 + tallest * 11;

  const draw = () => {
    const w = svg.clientWidth || 600;
    const y = h - 34, pad = 8;
    const span = w - pad * 2;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.style.height = `${h}px`;
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
  const setPointed = (id) => {
    document.querySelectorAll('[data-item].is-pointed').forEach((el) => el.classList.remove('is-pointed'));
    if (!id) { if (caption) caption.textContent = defaultCaption; return; }
    document.querySelectorAll(`[data-item="${CSS.escape(id)}"]`).forEach((el) => el.classList.add('is-pointed'));
    const item = byId.get(id);
    if (caption && item) caption.textContent = `${item.place}: ${item.headline}`;
  };
  const target = (e) => e.target.closest?.('[data-item]')?.dataset.item;
  document.addEventListener('pointerover', (e) => setPointed(target(e)));
  document.addEventListener('focusin', (e) => setPointed(target(e)));
  document.addEventListener('focusout', () => setPointed(null));
}

/* ---- search and filters (all-articles page) ------------------------------ */

export const FILTER_KEYS = ['q', 'lane', 'stage', 'type', 'flag', 'amount'];

/** Filter state from a query string; unknown keys are ignored. */
export function parseFilters(search = '') {
  const params = new URLSearchParams(search);
  const state = {};
  for (const key of FILTER_KEYS) state[key] = params.get(key) ?? '';
  state.amount = state.amount === '1' ? '1' : '';
  return state;
}

/** Query string for a filter state, leaving out empty keys. */
export function filterQuery(state) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) if (state[key]) params.set(key, state[key]);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Everything a search can match on, lowercased. */
function haystack(item) {
  return [
    item.headline, item.note, item.place, item.entity_name, typeLabel(item.type), STAGES[item.stage],
    ...(item.flags ?? []).map((f) => flagText(f).text),
    ...(item.sources ?? []).map((src) => `${src.publisher ?? ''} ${src.title ?? ''}`),
  ].filter(Boolean).join(' ').toLowerCase();
}

/** Items matching every active filter. Search needs every word to appear. */
export function filterItems(items, state) {
  const words = String(state.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) =>
    (!state.lane || item.lane === state.lane)
    && (!state.stage || item.stage === state.stage)
    && (!state.type || item.type === state.type)
    && (!state.flag || (item.flags ?? []).some((f) => f.type === state.flag))
    && (!state.amount || formatAmount(item.amount, item.currency))
    && (!words.length || words.every((w) => haystack(item).includes(w))));
}

/** Dropdown options: only values present in the items, in vocabulary order. */
export function filterOptions(items) {
  const has = (pick) => new Set(items.flatMap(pick));
  const lanes = has((i) => [i.lane]);
  const stages = has((i) => [i.stage]);
  const types = has((i) => [i.type]);
  const flags = has((i) => (i.flags ?? []).map((f) => f.type));
  return {
    lane: LANES.filter((l) => lanes.has(l.id)).map((l) => [l.id, l.label]),
    stage: Object.keys(STAGES).filter((k) => stages.has(k)).map((k) => [k, STAGES[k]]),
    type: Object.keys(TYPE_LABELS).filter((k) => types.has(k)).map((k) => [k, TYPE_LABELS[k]])
      .sort((a, b) => a[1].localeCompare(b[1])),
    flag: Object.keys(FLAGS).filter((k) => flags.has(k)).map((k) => [k, FLAGS[k].name]),
  };
}

function fillSelect(select, options, value) {
  if (!select) return;
  const first = select.querySelector('option');  // the "any" option stays
  select.replaceChildren(first, ...options.map(([v, label]) => new Option(label, v)));
  select.value = options.some(([v]) => v === value) ? value : '';
}

/* ---- mounting ------------------------------------------------------------ */

/* The fictional sample file is for previewing the design on a local server
   only. It is never loaded on the published site. */
function dataUrl() {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (local && new URLSearchParams(location.search).has('sample')) return '/tests/fixtures/wny-sample.json';
  /* An issue page reads its frozen copy (data/wny/issue-NAME.json); other
     pages read the latest export. Only paths under /data/ are accepted. */
  const own = document.querySelector('[data-wny-src]')?.getAttribute('data-wny-src') ?? '';
  return /^\/data\/[\w/-]+\.json$/.test(own) ? own : '/data/wny.json';
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
      items.slice(0, RECENT_LIMIT).map(renderCompact).join(''));
    for (const lane of LANES) {
      const section = root.querySelector(`[data-wny-lane="${lane.id}"]`);
      const inLane = items.filter((i) => i.lane === lane.id);
      if (!section || !inLane.length) continue;
      show(section.querySelector('ul'), inLane.map(renderItem).join(''));
      show(section);
    }
    const money = moneyLines(items);
    if (money.length) {
      show(root.querySelector('[data-wny="money-list"]'), renderMoney(money));
      show(root.querySelector('[data-wny="money-total"]'), renderMoneyTotal(money));
      show(root.querySelector('[data-wny="money"]'));
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
  const form = root.querySelector('[data-wny="filters"]');
  const count = root.querySelector('[data-wny="count"]');
  const none = root.querySelector('[data-wny="no-match"]');
  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error('wny.json failed to load', err);
    show(root.querySelector('[data-wny="error"]'));
    return;
  }
  const items = byNewest(publishable(data.items));
  updated(root, data);
  if (!items.length) {
    show(root.querySelector('[data-wny="empty"]'));
    return;
  }

  let state = parseFilters(location.search);
  if (form) {
    const options = filterOptions(items);
    for (const key of ['lane', 'stage', 'type', 'flag']) fillSelect(form.elements[key], options[key], state[key]);
    state = { ...state, ...Object.fromEntries(['lane', 'stage', 'type', 'flag'].map((k) => [k, form.elements[k].value])) };
    form.elements.q.value = state.q;
    form.elements.amount.checked = state.amount === '1';
    show(form);
  }

  const render = () => {
    const shown = filterItems(items, state);
    list.innerHTML = shown.map(renderItem).join('');
    list.hidden = !shown.length;
    if (none) none.hidden = shown.length > 0;
    if (count) {
      const active = FILTER_KEYS.some((k) => state[k]);
      count.textContent = active
        ? `Showing ${shown.length} of ${items.length} ${items.length === 1 ? 'story' : 'stories'}`
        : `${items.length} ${items.length === 1 ? 'story' : 'stories'}`;
      count.hidden = false;
    }
    const clear = form?.querySelector('[data-wny="clear"]');
    if (clear) clear.hidden = !FILTER_KEYS.some((k) => state[k]);
    window.NASketch?.redraw();
  };

  /* Filters apply as you type. The URL keeps them, without adding a history
     entry per keystroke, so a filtered view can be shared or bookmarked. */
  const read = () => ({
    q: form.elements.q.value.trim(),
    lane: form.elements.lane.value,
    stage: form.elements.stage.value,
    type: form.elements.type.value,
    flag: form.elements.flag.value,
    amount: form.elements.amount.checked ? '1' : '',
  });
  const apply = () => {
    state = read();
    history.replaceState(null, '', `${location.pathname}${filterQuery(state)}`);
    render();
  };
  form?.addEventListener('submit', (e) => e.preventDefault());
  form?.addEventListener('input', apply);
  form?.addEventListener('change', apply);
  form?.querySelector('[data-wny="clear"]')?.addEventListener('click', () => {
    form.reset();
    apply();
    form.elements.q.focus();
  });
  none?.querySelector('button')?.addEventListener('click', () => {
    form.reset();
    apply();
  });

  render();
}

function updated(root, data) {
  const el = root.querySelector('[data-wny="updated"]');
  const when = data.generated_at ? formatDate(String(data.generated_at).slice(0, 10)) : '';
  if (el && when) show(el, `Updated ${escapeHtml(when)} from reviewed Niagara Assembly research.`);
}
