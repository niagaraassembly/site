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
import { JOIN_ACTION, JOIN_MAP, buildFormBody, submitTo, validateJoin } from './submit.js';

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

/* Kinds of money, from na-research's amount_type. Kinds are totalled
   separately and never added together: a purchase price is not money spent
   in the region, and a reported award is not money committed. An unknown
   amount_type falls into "Other amounts" rather than vanishing. */
export const MONEY_KINDS = [
  { id: 'investment', label: 'Investment', types: ['investment'] },
  /* Kept apart (na-research, 2026-10-10): obligated is government money
     committed; award is the value a company reports, e.g. SRC's $37M. */
  { id: 'committed', label: 'Contracts: money committed', types: ['obligated'] },
  { id: 'awards', label: 'Awards as reported', types: ['award'] },
  { id: 'deals', label: 'Deals', types: ['transaction'] },
  { id: 'grants', label: 'Grants', types: ['grant'] },
  { id: 'proposed', label: 'Proposed', types: ['proposed'] },
  { id: 'charges', label: 'Charges', types: ['charge'] },
  { id: 'other', label: 'Other amounts', types: [] },
];

export function moneyKind(item) {
  return (MONEY_KINDS.find((k) => k.types.includes(item.amount_type)) ?? MONEY_KINDS.at(-1)).id;
}

/** The money list grouped by kind, in MONEY_KINDS order, empty kinds left out. */
export function moneyGroups(lines) {
  return MONEY_KINDS.map((kind) => ({ ...kind, lines: lines.filter((i) => moneyKind(i) === kind.id) }))
    .filter((group) => group.lines.length);
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
    .map(([id, count]) => ({ ...(byId.get(id) ?? { id, name: items.find((i) => i.entity_id === id)?.entity_name }), count,
      first: items.find((i) => i.entity_id === id)?.id }))
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
  const chips = flags.filter((f) => f.tone !== 'plain');
  const plain = flags.filter((f) => f.tone === 'plain');
  return (chips.length
    ? `<ul class="wny-flags">${chips.map((f) =>
      `<li class="wny-flag wny-flag--${f.tone}">${escapeHtml(f.text)}</li>`).join('')}</ul>`
    : '')
    + (plain.length
      ? `<p class="wny-flags__plain">${plain.map((f) => escapeHtml(f.text.replace(/\.?$/, '.'))).join(' ')}</p>`
      : '');
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

/** "2027" / "June 2027" / "Oct. 31, 2026" from YYYY, YYYY-MM or YYYY-MM-DD. */
export function partialDate(value) {
  const v = String(value ?? '');
  if (/^\d{4}$/.test(v)) return v;
  const m = v.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(m[2]) - 1] ?? ''} ${m[1]}`.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? apDate(v) : '';
}

function incentiveText(inc, currency) {
  return [formatAmount(inc.amount, currency), words(inc.type), inc.program ? `(${inc.program})` : '']
    .filter(Boolean).join(' ');
}

/** Jobs, public support, next step and stage history, where the research has them. */
function factsHtml(item) {
  const rows = [];
  const jobs = [
    item.jobs_added != null ? `${item.jobs_added} added` : '',
    item.jobs_lost != null ? `${item.jobs_lost} lost` : '',
  ].filter(Boolean).join(', ');
  if (jobs) rows.push(['Jobs', escapeHtml(jobs)]);
  if (item.incentive) rows.push(['Public support', escapeHtml(incentiveText(item.incentive, item.currency))]);
  if (item.next_step?.text) {
    rows.push(['Next', escapeHtml([item.next_step.text, partialDate(item.next_step.date)].filter(Boolean).join(', '))]);
  }
  const steps = (item.stage_history ?? []).filter((h) => STAGES[h.stage]);
  if (steps.length) {
    rows.push(['Stage', steps.map((h) => escapeHtml([STAGES[h.stage], apDate(h.date)].filter(Boolean).join(' '))).join(' → ')]);
  }
  return rows.length
    ? `<dl class="wny-facts">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`
    : '';
}

/** Dated next steps, soonest first. */
export function comingUp(items) {
  return items.filter((i) => i.next_step?.text && partialDate(i.next_step.date))
    .sort((a, b) => a.next_step.date.localeCompare(b.next_step.date) || a.id.localeCompare(b.id));
}

export function renderComingUp(items) {
  return comingUp(items).map((i) =>
    `<li class="wny-money__line" data-item="${escapeHtml(i.id)}">`
    + `<span class="wny-coming__date">${escapeHtml(partialDate(i.next_step.date))}</span>`
    + `<a class="wny-money__what" href="#wny-${escapeHtml(i.id)}">${escapeHtml(i.next_step.text)}</a>`
    + `<span class="wny-money__meta">${[i.entity_name, i.place].filter(Boolean).map(escapeHtml).join(' · ')}</span></li>`).join('');
}

/** Stated job figures, and stories where sources disagree on jobs. */
export function jobLines(items) {
  return items.filter((i) => i.jobs_added != null || i.jobs_lost != null
    || (i.flags ?? []).some((f) => f.type === 'conflict' && /^jobs_(added|lost)$/.test(f.detail)));
}

export function renderJobs(items) {
  return jobLines(items).map((i) => {
    const figure = i.jobs_added != null ? `+${i.jobs_added}` : i.jobs_lost != null ? `−${i.jobs_lost}` : 'Disputed';
    const tone = i.jobs_added != null ? ' wny-amount--done' : '';
    const what = i.jobs_added != null || i.jobs_lost != null ? i.headline : `${i.headline}: sources disagree on jobs`;
    return `<li class="wny-money__line" data-item="${escapeHtml(i.id)}">`
      + `<span class="wny-money__amount${tone}">${escapeHtml(figure)}</span>`
      + `<a class="wny-money__what" href="#wny-${escapeHtml(i.id)}">${escapeHtml(what)}</a>`
      + `<span class="wny-money__meta">${[STAGES[i.stage], i.place].filter(Boolean).map(escapeHtml).join(' · ')}</span></li>`;
  }).join('');
}

/** Public incentives; never added to the dollar figures, never summed. */
export function renderIncentives(items) {
  return items.filter((i) => i.incentive).map((i) =>
    `<li class="wny-money__line" data-item="${escapeHtml(i.id)}">`
    + `<span class="wny-money__amount">${escapeHtml(formatAmount(i.incentive.amount, i.currency) || '—')}</span>`
    + `<a class="wny-money__what" href="#wny-${escapeHtml(i.id)}">${escapeHtml(i.incentive.program || i.headline)}</a>`
    + `<span class="wny-money__meta">${[words(i.incentive.type), i.entity_name].filter(Boolean).map(escapeHtml).join(' · ')}</span></li>`).join('');
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
    + factsHtml(item)
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
export function renderMoneyTotal(lines, label = 'Total of stated amounts') {
  const sums = moneyByStage(lines).map(({ currency, amount, parts }) => {
    const pieces = parts.map((part) =>
      `<span class="wny-money__part"><b class="wny-money__sum${toneClass(part.stage)}">${escapeHtml(formatAmount(part.amount, currency))}</b>`
      + ` ${escapeHtml((STAGES[part.stage] ?? 'other').toLowerCase())}</span>`);
    return pieces.join(' + ')
      + (parts.length > 1 ? ` = <b class="wny-money__sum">${escapeHtml(formatAmount(amount, currency))}</b>` : '');
  });
  return `<span class="wny-money__label">${escapeHtml(label)}</span>`
    + `<span class="wny-money__sums">${sums.join(' · ')}</span>`;
}

/** Each kind: a heading, its lines, and (for two or more) its own total. */
export function renderMoneyGroups(lines) {
  return moneyGroups(lines).map((group) =>
    `<li class="wny-money__group"><h3 class="wny-money__kind">${escapeHtml(group.label)}</h3>`
    + `<ul class="wny-money__list">${renderMoney(group.lines)}</ul>`
    + (group.lines.length > 1
      ? `<p class="wny-money__line wny-money__total">${renderMoneyTotal(group.lines, `${group.label} total`)}</p>`
      : '')
    + '</li>').join('');
}

export function renderCompanies(companies) {
  return companies.map((c) => {
    /* The organisation's website when the research has one; otherwise its
       story on this page, so every name leads somewhere. */
    const url = safeHttpUrl(c.website);
    const href = url ?? (c.first ? `#wny-${c.first}` : null);
    const name = href
      ? `<a href="${escapeHtml(href)}"${url ? ' rel="noopener"' : ''}>${escapeHtml(c.name)}</a>`
      : escapeHtml(c.name);
    return `<li class="wny-company"><span class="wny-company__name">${name}</span>`
      + `<span class="wny-company__meta">${[c.city, String(c.count)].filter(Boolean).map(escapeHtml).join(' · ')}</span></li>`;
  }).join('');
}

/* ---- mentions -------------------------------------------------------------- */

/** People named in the issue's stories, from intel/event_people.csv via the
    export. Only people on a published story are listed; one entry per name
    and organisation, with every story they appear in. */
export function mentionsFor(people, items) {
  const shown = new Set(items.map((i) => i.id));
  const byKey = new Map();
  for (const p of people ?? []) {
    if (!p.name || !shown.has(p.event_id)) continue;
    const key = `${p.name}|${p.organization ?? ''}`;
    const entry = byKey.get(key) ?? { name: p.name, role: p.role ?? '', organization: p.organization ?? '', events: [] };
    entry.events.push(p.event_id);
    byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function renderMentions(mentions) {
  return mentions.map((m) =>
    `<li class="wny-company"><span class="wny-company__name">${m.events?.[0]
      ? `<a href="#wny-${escapeHtml(m.events[0])}">${escapeHtml(m.name)}</a>` : escapeHtml(m.name)}</span>`
    + `<span class="wny-company__meta">${[m.role, m.organization].filter(Boolean).map(escapeHtml).join(', ')}</span></li>`
  ).join('');
}

/* ---- sign-up ----------------------------------------------------------------
   The homepage's mailing-list form as is: Google Form -> Apps Script -> Kit
   (tag na-list). Level is fixed to List; nothing else is sent. */

function mountSignup(root) {
  const form = root.querySelector('[data-wny="signup"]');
  if (!form) return;
  const status = form.querySelector('.status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = { ...Object.fromEntries(new FormData(form).entries()), level: 'List' };
    const errors = validateJoin(values);
    if (errors.length || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email ?? '')) {
      status.dataset.state = 'error';
      status.textContent = errors.includes('name') ? 'Add your name.' : 'Add an email address, like name@example.com.';
      return;
    }
    status.dataset.state = 'sending';
    status.textContent = 'Subscribing…';
    try {
      await submitTo(JOIN_ACTION, buildFormBody(values, JOIN_MAP));
      form.reset();
      status.dataset.state = 'done';
      status.textContent = 'Subscribed. Check your inbox to confirm.';
    } catch {
      status.dataset.state = 'error';
      status.textContent = 'That didn’t go through. Check your connection and try again.';
    }
  });
}

/* ---- headline ticker ------------------------------------------------------ */

export const TICKER_MS = 3500;

/** One line: place, then headline, linking to the story's card. */
export function tickerLine(item) {
  return `<a class="wny-ticker__item" href="#wny-${escapeHtml(item.id)}">`
    + (item.place ? `<span class="wny-ticker__place">${escapeHtml(item.place)}</span> ` : '')
    + `${escapeHtml(item.headline)}</a>`;
}

/* Cycles the issue's headlines on one line. Pauses while pointed at or
   focused, and on its own button (auto-changing content must be stoppable).
   With reduced motion it never changes by itself; the button steps instead. */
function mountTicker(root, items) {
  const el = root.querySelector('[data-wny="ticker"]');
  if (!el || !items.length) return;
  const line = el.querySelector('.wny-ticker__line');
  const button = el.querySelector('.wny-ticker__toggle');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0, paused = still, held = false, timer = null;

  const showAt = (i) => {
    index = (i + items.length) % items.length;
    line.innerHTML = tickerLine(items[index]);
  };
  const label = () => {
    if (!button) return;
    button.textContent = still ? 'Next' : paused ? 'Play' : 'Pause';
    button.setAttribute('aria-label', still ? 'Next headline' : paused ? 'Play headlines' : 'Pause headlines');
  };
  const run = () => {
    clearInterval(timer);
    timer = paused || held || items.length < 2 ? null : setInterval(() => showAt(index + 1), TICKER_MS);
  };

  showAt(0);
  label();
  if (button) {
    button.hidden = items.length < 2;
    button.addEventListener('click', () => {
      if (still) { showAt(index + 1); return; }
      paused = !paused;
      label();
      run();
    });
  }
  const hold = (on) => { held = on; run(); };
  line.addEventListener('pointerenter', () => hold(true));
  line.addEventListener('pointerleave', () => hold(false));
  line.addEventListener('focusin', () => hold(true));
  line.addEventListener('focusout', () => hold(false));
  el.hidden = false;
  run();
}

/* ---- county band -------------------------------------------------------------
   A two-row quilt of the region's county outlines under the title. The page
   names its outline file (data-county-band), so another MAG can use its own;
   scripts/wny/counties.py builds the file from Census TIGERweb outlines. */

/** SVG path data for a county's rings (coordinates already fitted to 0-100). */
export function countyPath(county) {
  return (county.rings ?? []).map((ring) =>
    `M${ring.map(([x, y]) => `${x} ${y}`).join('L')}Z`).join('');
}

/** Tiles grow with their county's width-to-height ratio, so each row fills
    the band exactly; very tall or very wide counties are held to a range. */
export function tileGrow(county) {
  const ratio = (county.width || 1) / (county.height || 1);
  return Math.min(1.8, Math.max(0.7, ratio)).toFixed(3);
}

/** A story's colour in the county band: the amount tones (completed green,
    announced yellow), or "news" (dark grey) for every other stage. */
export function newsTone(item) {
  return AMOUNT_TONES[item.stage] ?? 'news';
}
export const TONE_WORDS = { done: 'completed', announced: 'announced', news: 'other news' };

/** Stories per county: count, newest story, and how many of each tone. */
export function storiesByCounty(items) {
  const out = new Map();
  for (const item of items) {
    if (!item.county) continue;
    const entry = out.get(item.county) ?? { count: 0, first: item.id, tones: {} };
    entry.count += 1;
    const tone = newsTone(item);
    entry.tones[tone] = (entry.tones[tone] ?? 0) + 1;
    out.set(item.county, entry);
  }
  return out;
}

/* Tone order for the county stripes: completed, announced, other news. */
const HATCH = [{ tone: 'done' }, { tone: 'announced' }, { tone: 'news' }];

async function mountCountyBand(root, items = []) {
  const band = root.querySelector('[data-county-band]');
  if (!band) return;
  const src = band.getAttribute('data-county-band');
  if (!/^\/data\/[\w/-]+\.json$/.test(src)) return;
  let geo;
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    geo = await res.json();
  } catch (err) {
    console.error('county outlines failed to load', err);
    return;  // the band stays hidden; nothing else depends on it
  }
  let index = 0;
  const stories = storiesByCounty(items);
  band.innerHTML = (geo.rows ?? []).map((row) =>
    `<ul class="county-band__row">${row.map((name) => {
      const c = geo.counties?.[name];
      if (!c) return '';
      const here = stories.get(name);
      const mix = here ? HATCH.filter((h) => here.tones[h.tone]).map((h) => `${here.tones[h.tone]} ${TONE_WORDS[h.tone]}`).join(', ') : '';
      const label = here ? `${name} County: ${here.count} ${here.count === 1 ? 'story' : 'stories'} in this issue (${mix})` : `${name} County`;
      const inner = `<svg viewBox="-4 -4 ${c.width + 8} ${c.height + 8}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"></svg>`
        + `<span class="county-band__name">${escapeHtml(name)}${here ? ` <b class="county-band__count">${here.count}</b>` : ''}</span>`;
      const tones = here ? HATCH.filter((h) => here.tones[h.tone]).map((h) => h.tone).join(' ') : '';
      return `<li class="county-band__tile${here ? ' county-band__tile--news' : ''}" style="flex-grow:${tileGrow(c)}" data-county="${escapeHtml(name)}" data-tones="${tones}" data-seed="${index++}" title="${escapeHtml(label)}">`
        + (here ? `<a class="county-band__link" href="#wny-${escapeHtml(here.first)}" aria-label="${escapeHtml(label)}">${inner}</a>` : inner)
        + '</li>';
    }).join('')}</ul>`).join('');

  /* Hand-drawn like the frame and the corridor line: fixed seeds so the
     wobble never re-rolls, hachure fill for the quilt's stitching, and
     currentColor so the theme toggle recolours without a redraw. */
  for (const tile of band.querySelectorAll('.county-band__tile')) {
    const c = geo.counties[tile.dataset.county];
    const svg = tile.querySelector('svg');
    const d = countyPath(c);
    const seed = 2026 + Number(tile.dataset.seed);
    const tones = (tile.dataset.tones || '').split(' ').filter(Boolean);
    if (typeof rough === 'undefined') {
      const path = document.createElementNS(SVG_NS, 'path');
      Object.entries({ d, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.2, 'vector-effect': 'non-scaling-stroke' })
        .forEach(([k, v]) => path.setAttribute(k, v));
      svg.appendChild(path);
      continue;
    }
    const rc = rough.svg(svg);
    /* Every county is striped on the same 45-degree diagonal. A county with
       several kinds of news alternates their colours stripe by stripe, so
       each colour keeps its direction and stays easy to pick out. Stripes
       are hand-drawn lines clipped to the outline; the outline is drawn on
       top. Units are the outline's 0-100 box (about 0.44px each on screen):
       a 10-unit step puts stripes about 4.4px apart, so neighbouring colours
       never blur together; each colour repeats every 10 x (number of
       colours) units. */
    const STEP = 10;
    const colours = tones.length
      ? HATCH.filter((h) => tones.includes(h.tone)).map((h) => (h.tone === 'news' ? 'var(--county-news)' : `var(--amount-${h.tone})`))
      : ['var(--county-quiet)'];
    const clipId = `county-clip-${tile.dataset.seed}`;
    const defs = document.createElementNS(SVG_NS, 'defs');
    const clip = document.createElementNS(SVG_NS, 'clipPath');
    clip.setAttribute('id', clipId);
    const clipPath = document.createElementNS(SVG_NS, 'path');
    clipPath.setAttribute('d', d);
    clip.appendChild(clipPath);
    defs.appendChild(clip);
    svg.appendChild(defs);
    const stripes = document.createElementNS(SVG_NS, 'g');
    stripes.setAttribute('clip-path', `url(#${clipId})`);
    const w = c.width, h = c.height;
    for (let k = 0, x = -h; x <= w; k += 1, x += STEP) {
      /* A line from (x, h) up to (x + h, 0): 45 degrees in the outline's units. */
      const line = rc.line(x, h + 2, x + h + 2, 0, {
        stroke: 'currentColor', strokeWidth: tones.length ? 3 : 1.8, roughness: 0.5, bowing: 0.3, seed: seed + k,
      });
      line.style.color = colours[k % colours.length];
      stripes.appendChild(line);
    }
    svg.appendChild(stripes);
    const outline = rc.path(d, { stroke: 'currentColor', strokeWidth: tones.length ? 2.4 : 1.6, roughness: 0.6, bowing: 0.4, seed });
    outline.style.color = tones.length ? 'var(--ink)' : 'var(--county-quiet)';
    svg.appendChild(outline);
  }
  band.hidden = false;
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
      /* Same tones as the amounts; hollow when only planned. currentColor
         plus a CSS colour on the group keeps the theme toggle working. */
      const hollow = m.item.lane === 'developing';
      const tone = AMOUNT_TONES[m.item.stage];
      let node;
      if (rc) {
        node = rc.circle(cx, cy, 9, hollow
          ? { ...opts, seed: SEED + 50 + i }
          : { ...opts, seed: SEED + 50 + i, fill: 'currentColor', fillStyle: 'solid' });
      } else {
        node = document.createElementNS(SVG_NS, 'circle');
        Object.entries({ cx, cy, r: 4.5, fill: hollow ? 'none' : 'currentColor', stroke: 'currentColor', 'stroke-width': 1.4 })
          .forEach(([k, v]) => node.setAttribute(k, v));
      }
      if (tone) node.style.color = `var(--amount-${tone})`;
      svg.appendChild(node);
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

/* ---- investments page ------------------------------------------------------ */

export const INVEST_KEYS = ['q', 'kind', 'stage', 'lane'];

/** Every published item with a stated amount, newest first. */
export function investmentLines(items) {
  return byNewest(items.filter((i) => formatAmount(i.amount, i.currency)));
}

export function filterInvestments(lines, state) {
  return filterItems(lines, { q: state.q, stage: state.stage, lane: state.lane })
    .filter((i) => !state.kind || moneyKind(i) === state.kind);
}

export function investmentOptions(lines) {
  const kinds = new Set(lines.map(moneyKind));
  const base = filterOptions(lines);
  return { kind: MONEY_KINDS.filter((k) => kinds.has(k.id)).map((k) => [k.id, k.label]), stage: base.stage, lane: base.lane };
}

/** Lines grouped by kind; each kind totals its investment-and-industry lines
    only (other sections are listed but never counted), and kinds are never
    added together. */
export function renderInvestments(lines) {
  return moneyGroups(lines).map((group) => {
    const counted = group.lines.filter((i) => i.lane === 'production');
    const rows = group.lines.map((i) =>
      `<li class="wny-money__line" data-item="${escapeHtml(i.id)}">`
      + `<span class="wny-money__amount${toneClass(i.stage)}">${escapeHtml(formatAmount(i.amount, i.currency))}</span>`
      + `<a class="wny-money__what" href="/MAGS/WNY/posts/#wny-${escapeHtml(i.id)}">${escapeHtml(i.headline)}</a>`
      + `<span class="wny-money__meta">${[STAGES[i.stage], words(i.amount_type), i.place,
        i.lane === 'production' ? '' : LANES.find((l) => l.id === i.lane)?.label,
        formatAmount(i.ceiling_amount, i.currency) ? `ceiling ${formatAmount(i.ceiling_amount, i.currency)}` : '']
        .filter(Boolean).map(escapeHtml).join(' · ')}</span></li>`).join('');
    const total = counted.length > 1 || (counted.length === 1 && group.lines.length > 1)
      ? `<p class="wny-money__line wny-money__total">${renderMoneyTotal(counted, `${group.label} total, investment and industry only`)}</p>`
      : '';
    return `<li class="wny-money__group"><h3 class="wny-money__kind">${escapeHtml(group.label)}</h3>`
      + `<ul class="wny-money__list">${rows}</ul>${total}</li>`;
  }).join('');
}

export async function mountInvestments(root = document) {
  const list = root.querySelector('[data-wny="investments"]');
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
  const lines = investmentLines(publishable(data.items));
  updated(root, data);
  if (!lines.length) {
    show(root.querySelector('[data-wny="empty"]'));
    return;
  }
  const params = new URLSearchParams(location.search);
  let state = Object.fromEntries(INVEST_KEYS.map((k) => [k, params.get(k) ?? '']));
  const options = investmentOptions(lines);
  for (const key of ['kind', 'stage', 'lane']) fillSelect(form.elements[key], options[key], state[key]);
  state = { ...state, kind: form.elements.kind.value, stage: form.elements.stage.value, lane: form.elements.lane.value };
  form.elements.q.value = state.q;
  show(form);

  const render = () => {
    const shown = filterInvestments(lines, state);
    list.innerHTML = renderInvestments(shown);
    list.hidden = !shown.length;
    none.hidden = shown.length > 0;
    const active = INVEST_KEYS.some((k) => state[k]);
    count.textContent = active
      ? `Showing ${shown.length} of ${lines.length} dollar figures`
      : `${lines.length} dollar figures`;
    count.hidden = false;
    form.querySelector('[data-wny="clear"]').hidden = !active;
    window.NASketch?.redraw();
  };
  const apply = () => {
    state = Object.fromEntries(INVEST_KEYS.map((k) => [k, String(form.elements[k].value).trim()]));
    const qs = new URLSearchParams(Object.entries(state).filter(([, v]) => v)).toString();
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}`);
    render();
  };
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', apply);
  form.addEventListener('change', apply);
  for (const button of [form.querySelector('[data-wny="clear"]'), none.querySelector('button')]) {
    button?.addEventListener('click', () => { form.reset(); apply(); form.elements.q.focus(); });
  }
  render();
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

const AP_MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

/** "Oct. 10, 2026": AP style, matching the coverage dates. */
export function apDate(iso) {
  const x = new Date(`${iso}T12:00:00`);
  return Number.isNaN(x.getTime()) ? '' : `${AP_MONTHS[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`;
}

/** "Sept. 28 to Oct. 9, 2026" (AP-style months, year once when shared). */
export function coverageText(start, end) {
  const d = (iso) => new Date(`${iso}T12:00:00`);
  const a = d(start), b = d(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
  const md = (x) => `${AP_MONTHS[x.getMonth()]} ${x.getDate()}`;
  return a.getFullYear() === b.getFullYear()
    ? `${md(a)} to ${md(b)}, ${b.getFullYear()}`
    : `${md(a)}, ${a.getFullYear()} to ${md(b)}, ${b.getFullYear()}`;
}

/** The page's issue record, if it names one and the export has it. */
export function issueFor(data, id) {
  return id ? (data.issues ?? []).find((i) => i.id === id) ?? null : null;
}

function mountIssue(root, issue) {
  if (!issue) return;
  const stamp = root.querySelector('.issue-stamp');
  const when = issue.published ? apDate(issue.published) : '';
  const span = coverageText(issue.coverage_start, issue.coverage_end);
  if (stamp) stamp.textContent = [issue.title, when, span ? `News from ${span}` : ''].filter(Boolean).join(' · ');
  if (issue.summary) show(root.querySelector('[data-wny="summary"]'), escapeHtml(issue.summary));
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
  /* An issue page shows exactly its issue's stories when the export lists
     them; otherwise everything in its frozen data file. */
  const issue = issueFor(data, root.querySelector('[data-wny-issue]')?.getAttribute('data-wny-issue'));
  const members = new Set(issue?.events ?? []);
  const items = byNewest(publishable(data.items)).filter((i) => !members.size || members.has(i.id));
  mountIssue(root, issue);
  mountCountyBand(root, items);
  drawCorridor(root, items);
  mountTicker(root, items);
  mountSignup(root);

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
      show(root.querySelector('[data-wny="money-list"]'), renderMoneyGroups(money));
      show(root.querySelector('[data-wny="money"]'));
    }
    for (const [key, html] of [['coming', renderComingUp(items)], ['jobs', renderJobs(items)], ['support', renderIncentives(items)]]) {
      if (!html) continue;
      show(root.querySelector(`[data-wny="${key}-list"]`), html);
      show(root.querySelector(`[data-wny="${key}"]`));
    }
    const mentions = mentionsFor(data.people, items);
    if (mentions.length) {
      show(root.querySelector('[data-wny="mentions-list"]'), renderMentions(mentions));
      show(root.querySelector('[data-wny="mentions"]'));
    }
    const bar = root.querySelector('[data-wny="issue-list"]');
    if (bar) {
      bar.querySelector('.wny-allbar__count').textContent = `${items.length} ${items.length === 1 ? 'article' : 'articles'}`;
      bar.querySelector('ul').innerHTML = items.map(renderCompact).join('');
      bar.hidden = false;
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
