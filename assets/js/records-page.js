/* The Records page and each desk's Dollar Figures page.
 *
 * One form drives everything: the record-type tabs, the shared period and
 * issue controls, and the filters that belong to the current type. Every
 * change is written to the URL, so any view can be linked and the back
 * button works. A page with data-record-region is locked to that desk and
 * to Dollar Figures.
 */

import { escapeHtml as e, safeHttpUrl } from './escape.js';
import { renderItem, investmentLines, MONEY_KINDS, moneyKind, moneyCells, renderMoneyCells, renderInvestments } from './wny.js';
import { periodLabel, byCurrency } from './desk-periods.js';
import { TYPES, readState, writeState, recordsFor, facetOptions, activeFilters, words } from './records.js';

const root = document.querySelector('[data-records]');
const form = root.querySelector('#records-form');
const results = root.querySelector('#record-results');
const summary = root.querySelector('#records-summary');
const tabs = root.querySelector('#records-tabs');
const facetBox = root.querySelector('#records-facets');
const locked = root.dataset.recordRegion || '';
const fields = form.elements;
const quarters = [...form.querySelectorAll('[name="quarter"]')];
const url = (s) => e(safeHttpUrl(s) || '#');
const DATE = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
/* Headquarters codes from the research export, said in words. */
const HQ = { wny: 'In Western New York', elsewhere: 'Outside the region' };
const fmtDate = (iso) => (iso ? DATE.format(new Date(iso)) : '');

async function load(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

/* A record's fields as a labelled list. Empty values are left out rather
   than shown as blanks, so every label on the page carries a value. */
function fieldList(pairs) {
  const rows = pairs.filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `<div><dt>${e(k)}</dt><dd>${v}</dd></div>`).join('');
  return rows ? `<dl class="rec__fields">${rows}</dl>` : '';
}

function rec(id, name, pairs, links = []) {
  return `<article class="rec"><p class="rec__id">${e(id || '—')}</p><div class="rec__body"><h3 class="rec__name">${e(name)}</h3>`
    + fieldList(pairs)
    + (links.length ? `<p class="rec__links">${links.join('')}</p>` : '')
    + '</div></article>';
}

const RENDER = {
  news: (records) => `<ul class="issue-list wny-cards">${records.map(renderItem).join('')}</ul>`,
  companies: (records, desk) => records.map((x) => rec(x.id, x.name, [
    ['Kind', e(words(x.type))], ['City', e(x.city ?? '')], ['Headquarters', e(HQ[x.hq_region] ?? x.hq_region ?? '')],
    ['In the record', `${x.mentions} ${x.mentions === 1 ? 'news item' : 'news items'}`]
  ], [
    x.website ? `<a href="${url(x.website)}" rel="noopener">Website ↗</a>` : '',
    `<a href="${e(desk.href)}posts/?q=${encodeURIComponent(x.name)}">Related news ↗</a>`
  ].filter(Boolean))).join(''),
  people: (records, desk) => records.map((x) => rec('', x.name, [
    ['Role', e(x.role)], ['Organization', e(x.organization)],
    ['In the record', `${x.events.length} ${x.events.length === 1 ? 'news item' : 'news items'}`]
  ], x.events.map((id) => `<a href="${e(desk.href)}posts/#wny-${e(id)}">Story ${e(id)} ↗</a>`))).join(''),
  sources: (records) => records.map((x) => rec(x.article_id, x.title, [
    ['Publisher', e(x.publisher ?? '')], ['Kind', e(words(x.kind))],
    ['Cited by', `${x.cites.length} ${x.cites.length === 1 ? 'news item' : 'news items'}`]
  ], [`<a href="${url(x.url)}" rel="noopener">Open source ↗</a>`])).join('')
};
RENDER.organizations = RENDER.companies;

function renderMoney(records, desk, issue, state) {
  const lines = investmentLines(records).filter((i) => !state.kind || moneyKind(i) === state.kind);
  const caption = issue ? `${issue.title}, ${issue.coverage_start || ''} to ${issue.coverage_end || ''}` : periodLabel(state);
  let html = `<p class="records-caption">${e(caption)}</p>`;
  for (const [currency, currencyItems] of byCurrency(investmentLines(records))) {
    const cells = moneyCells(currencyItems);
    const temp = document.createElement('ul');
    temp.innerHTML = renderMoneyCells(cells);
    [...temp.children].forEach((li, index) => {
      const cell = cells[index];
      li.innerHTML = `<button type="button" class="money-cell-button" data-money-kind="${e(cell.kind)}" aria-pressed="${state.kind === cell.kind}" aria-label="Show only ${e(cell.caption)}">${li.innerHTML}</button>`;
    });
    html += `<h4 class="records-currency">${e(currency)} totals</h4><ul class="wny-cells money-summary">${temp.innerHTML}</ul>`;
  }
  html += '<p class="records-note">Each cell is its own kind of money. Contract ceilings and public support are excluded; proposed spending and corridor figures are marked as not counted. Select a cell to show only its figures.</p>';
  for (const [currency, currencyLines] of byCurrency(lines)) {
    html += `<h4 class="records-currency">${e(currency)} figures</h4><ul class="wny-money__groups">${renderInvestments(currencyLines, { linkBase: `${desk.href}posts/` })}</ul>`;
  }
  return { html, total: lines.length };
}

async function start() {
  const registry = await load('/data/desks.json');
  const datasets = await Promise.all(registry.desks.map(async (desk) => {
    const data = desk.data ? await load(desk.data) : { items: [], issues: [], entities: [], people: [] };
    const issues = await Promise.all((desk.issues ?? []).map(async (issue) => {
      const snapshot = await load(issue.data);
      return { ...issue, ...((snapshot.issues ?? [])[0] ?? {}), key: issue.href, snapshot };
    }));
    return { desk, data, issues };
  }));
  const allIssues = datasets.flatMap((d) => d.issues);

  /* Static options: regions, years with data, kinds of money. */
  fields.region.innerHTML = '<option value="">All regions</option>'
    + registry.desks.map((d) => `<option value="${e(d.id)}">${e(d.name)}</option>`).join('');
  const years = [...new Set(datasets.flatMap(({ data, issues }) =>
    [...(data.items ?? []), ...issues.flatMap((i) => i.snapshot.items ?? [])]
      .map((i) => String(i.date ?? '').slice(0, 4)).filter((y) => /^\d{4}$/.test(y))))].sort().reverse();
  fields.year.innerHTML = '<option value="">All years</option>' + years.map((y) => `<option>${y}</option>`).join('');
  fields.kind.innerHTML = '<option value="">All kinds</option>' + MONEY_KINDS.map((k) => `<option value="${e(k.id)}">${e(k.label)}</option>`).join('');
  if (locked) fields.region.closest('label').hidden = true;

  const stamp = root.querySelector('#records-stamp');
  const generated = datasets.map((d) => d.data.generated_at).filter(Boolean).sort().at(-1);
  if (stamp && generated) {
    stamp.innerHTML = `Register compiled <time datetime="${e(generated)}">${e(fmtDate(generated))}</time> from ${datasets.filter((d) => d.desk.data).length} of ${datasets.length} regional desks.`;
  }

  function current() {
    const state = readState(location.search);
    if (locked) { state.region = locked; state.type = 'money'; }
    return state;
  }

  function syncForm(state) {
    fields.q.value = state.q;
    fields.region.value = state.region;
    fields.year.value = state.year;
    fields.kind.value = state.kind;
    fields.start.value = state.start;
    fields.end.value = state.end;
    for (const box of quarters) box.checked = state.quarters.includes(box.value);
    fields.kind.closest('label').hidden = state.type !== 'money';
    const options = (datasets.find((d) => d.desk.id === state.region)?.issues ?? [])
      .filter((i) => !state.year || String(i.published || i.coverage_end || '').startsWith(state.year));
    fields.issue.disabled = !state.region || !options.length;
    fields.issue.innerHTML = `<option value="">${!state.region ? 'Choose a region first' : !options.length ? 'No published issues' : 'All issues'}</option>`
      + options.map((i) => `<option value="${e(i.key)}">${e(i.title)}${i.published ? `, ${e(fmtDate(i.published))}` : ''}</option>`).join('');
    fields.issue.value = state.issue;
  }

  function syncFacets(state, all) {
    const facets = facetOptions(state.type, all);
    facetBox.innerHTML = facets.map((f) => `<label>${e(f.label)}<select name="${e(f.key)}"><option value="">All</option>`
      + f.values.map((v) => `<option value="${e(v.value)}">${e(v.label)} (${v.n})</option>`).join('')
      + '</select></label>').join('');
    for (const f of facets) facetBox.querySelector(`[name="${f.key}"]`).value = state[f.key];
    facetBox.hidden = !facets.length;
  }

  function draw() {
    const state = current();
    syncForm(state);

    /* Tab counts use the same region, period, issue and search as the
       current view, so a tab says exactly what it will show. */
    if (tabs) {
      tabs.innerHTML = TYPES.map((t) => {
        const n = datasets.reduce((sum, d) => {
          const { records } = recordsFor(t.id, d, { ...state, type: t.id, ...Object.fromEntries(['stage', 'event', 'county', 'etype', 'city', 'org', 'skind', 'publisher'].map((k) => [k, ''])) });
          return sum + (t.id === 'money' ? investmentLines(records).length : records.length);
        }, 0);
        const href = `?${writeState({ ...state, type: t.id, stage: '', event: '', county: '', etype: '', city: '', org: '', skind: '', publisher: '', kind: '' })}`;
        return `<a class="records-tab" href="${e(href)}" data-type="${t.id}"${t.id === state.type ? ' aria-current="page"' : ''}><span class="records-tab__label">${e(t.label)}</span><span class="records-tab__count">${n}</span></a>`;
      }).join('');
    }

    const type = TYPES.find((t) => t.id === state.type);
    let html = '';
    let shown = 0;
    let available = 0;
    const facetPool = [];
    for (const dataset of datasets) {
      const { desk } = dataset;
      if (state.region && state.region !== desk.id) continue;
      const { all, records } = recordsFor(state.type, dataset, state);
      facetPool.push(...all);
      let body;
      let total;
      if (state.type === 'money') {
        const issue = dataset.issues.find((i) => i.key === state.issue) ?? null;
        ({ html: body, total } = renderMoney(records, desk, issue, state));
        available += investmentLines(all).length;
        if (!total) body += `<p class="records-empty">${desk.data ? 'No dollar figures match this selection.' : 'No dollar figures have been published for this region yet.'}</p>`;
      } else {
        total = records.length;
        available += all.length;
        body = total ? RENDER[state.type](records, desk) : '';
      }
      shown += total;
      if (!total && state.type !== 'money' && !state.region) continue;
      if (!total && state.type !== 'money') body = `<p class="records-empty">${desk.data ? `No ${type.many} match this selection.` : `${desk.name} has not published any records yet.`}</p>`;
      html += `<section class="records-region"><header class="records-region__head"><h2>${e(desk.name)}</h2><p>${total} ${total === 1 ? type.one : type.many}</p></header>${body}</section>`;
    }
    syncFacets(state, facetPool);
    results.innerHTML = html || `<p class="records-empty">No ${type.many} match these filters. <button type="button" class="records-linkbutton" data-clear>Clear all filters</button></p>`;

    const scope = activeFilters(state, { desks: registry.desks, issues: allIssues, locked });
    summary.innerHTML = `<p class="records-summary__count"><strong>${shown}</strong> ${shown === 1 ? type.one : type.many}`
      + (shown !== available ? ` <span>of ${available}</span>` : '') + '</p>'
      + `<p class="records-summary__scope">${scope.length ? scope.map((s) => `<span>${e(s)}</span>`).join('') : '<span>All regions and dates</span>'}</p>`;
  }

  function update(target) {
    const state = current();
    const name = target?.name;
    for (const key of ['q', 'region', 'year', 'kind', 'start', 'end', 'issue']) state[key] = fields[key].value.trim();
    state.quarters = quarters.filter((b) => b.checked).map((b) => b.value);
    for (const select of facetBox.querySelectorAll('select')) state[select.name] = select.value;
    /* The period controls are alternatives: quarters and a year, a custom
       range, or an issue. Choosing one clears the others. */
    if (name === 'quarter' || name === 'year') {
      state.start = ''; state.end = ''; state.issue = '';
      if (name === 'quarter' && state.quarters.length && !state.year) state.year = years[0] || '';
    }
    if (name === 'start' || name === 'end') { state.quarters = []; state.year = ''; state.issue = ''; }
    if (name === 'region') state.issue = '';
    if (name === 'issue' && state.issue) {
      const issue = allIssues.find((i) => i.key === state.issue);
      state.quarters = []; state.year = '';
      state.start = issue?.coverage_start || ''; state.end = issue?.coverage_end || '';
    }
    if (locked) state.region = locked;
    history.replaceState(null, '', `?${writeState(state, { locked })}`);
    draw();
  }

  function clearAll() {
    const state = current();
    history.replaceState(null, '', `?${writeState({ type: state.type, quarters: [] }, { locked })}`);
    draw();
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); update(); });
  form.addEventListener('change', (event) => update(event.target));
  fields.q.addEventListener('input', () => update());
  root.querySelector('#records-clear').addEventListener('click', clearAll);
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-clear]')) { clearAll(); return; }
    const cell = event.target.closest('[data-money-kind]');
    if (cell) { fields.kind.value = fields.kind.value === cell.dataset.moneyKind ? '' : cell.dataset.moneyKind; update(); return; }
    const tab = event.target.closest('.records-tab');
    if (tab) { event.preventDefault(); history.pushState(null, '', tab.getAttribute('href')); draw(); }
  });
  window.addEventListener('popstate', draw);
  draw();
}

start().catch((error) => {
  console.error(error);
  summary.innerHTML = '<p class="records-empty">The records did not load. Reload the page to try again.</p>';
});
