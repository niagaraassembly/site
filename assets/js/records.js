/* Records: the shared register behind /records/ and each desk's Dollar
 * Figures page.
 *
 * Pure functions only, so the filtering rules test without a DOM; the page
 * itself is assets/js/records-page.js.
 *
 * Every record type is derived from the same published news items. A
 * period, an issue or a region therefore narrows companies, organizations,
 * people and sources too: an entity is "in" the selection when a news item
 * in the selection names it.
 */

import { publishable, byNewest, mentionsFor } from './wny.js';
import { uniqueEvents, readPeriod, inPeriod } from './desk-periods.js';

export const TYPES = [
  { id: 'news', label: 'News Items', one: 'news item', many: 'news items' },
  { id: 'money', label: 'Dollar Figures', one: 'dollar figure', many: 'dollar figures' },
  { id: 'companies', label: 'Companies', one: 'company', many: 'companies' },
  { id: 'organizations', label: 'Organizations', one: 'organization', many: 'organizations' },
  { id: 'people', label: 'People', one: 'person', many: 'people' },
  { id: 'sources', label: 'Sources', one: 'source', many: 'sources' }
];

/* Filters that belong to one record type, in display order. Each names the
   URL parameter, its label and how to read the value off a record. */
export const FACETS = {
  news: [
    { key: 'stage', label: 'Stage', of: (i) => i.stage },
    { key: 'event', label: 'Kind of event', of: (i) => i.type },
    { key: 'county', label: 'County', of: (i) => i.county }
  ],
  money: [],
  companies: [
    { key: 'etype', label: 'Kind of company', of: (x) => x.type },
    { key: 'city', label: 'City', of: (x) => x.city }
  ],
  organizations: [
    { key: 'etype', label: 'Kind of organization', of: (x) => x.type },
    { key: 'city', label: 'City', of: (x) => x.city }
  ],
  people: [
    { key: 'org', label: 'Organization', of: (x) => x.organization }
  ],
  sources: [
    { key: 'skind', label: 'Kind of source', of: (x) => x.kind },
    { key: 'publisher', label: 'Publisher', of: (x) => x.publisher }
  ]
};

const FACET_KEYS = [...new Set(Object.values(FACETS).flat().map((f) => f.key))];

/** "facility_expansion" → "Facility expansion". */
export function words(value) {
  const s = String(value ?? '').replace(/_/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

/** Everything the URL says: record type, search, period and facets. */
export function readState(search = '') {
  const p = new URLSearchParams(search);
  const type = TYPES.some((t) => t.id === p.get('type')) ? p.get('type') : 'news';
  const state = { ...readPeriod(search), type, q: (p.get('q') || '').trim() };
  for (const key of FACET_KEYS) state[key] = p.get(key) || '';
  return state;
}

/** The URL for a state, leaving out empty values. */
export function writeState(state, { locked = false } = {}) {
  const p = new URLSearchParams();
  if (!locked) p.set('type', state.type);
  for (const key of ['q', 'region', 'year', 'issue', 'start', 'end', 'kind', ...FACET_KEYS]) {
    if (locked && key === 'region') continue;
    if (state[key]) p.set(key, state[key]);
  }
  if (state.quarters?.length) p.set('quarters', state.quarters.join(','));
  return p.toString();
}

const isCompany = (x) => /company|business division/i.test(x.type ?? '');

/** One desk's published items for the current region, period or issue,
 *  before any type-specific facet. */
export function selectItems(dataset, state) {
  const { desk, data, issues } = dataset;
  if (state.region && state.region !== desk.id) return { items: [], issue: null };
  const issue = issues.find((i) => i.key === state.issue) ?? null;
  /* An issue reproduces its frozen edition. Otherwise every edition plus
     the live feed, each event counted once (the latest version wins). */
  const pool = issue
    ? issue.snapshot.items ?? []
    : [...issues.flatMap((i) => i.snapshot.items ?? []), ...(data.items ?? [])];
  let items = byNewest(publishable(uniqueEvents(pool)));
  if (issue?.events?.length) items = items.filter((i) => issue.events.includes(i.id));
  else if (!issue) items = items.filter((i) => inPeriod(i, state));
  return { items, issue };
}

const matches = (q) => (record) => !q || JSON.stringify(record).toLowerCase().includes(q.toLowerCase());

/** Records of one type for one desk, with search and facets applied.
 *  `all` is the same list before facets and search, for building options. */
export function recordsFor(type, dataset, state) {
  const { items } = selectItems(dataset, state);
  const { data } = dataset;
  let all;
  if (type === 'news' || type === 'money') {
    all = items;
  } else if (type === 'companies' || type === 'organizations') {
    const counts = new Map();
    for (const i of items) if (i.entity_id) counts.set(i.entity_id, (counts.get(i.entity_id) ?? 0) + 1);
    all = (data.entities ?? [])
      .filter((x) => counts.has(x.id) && (type === 'companies' ? isCompany(x) : !isCompany(x)))
      .map((x) => ({ ...x, mentions: counts.get(x.id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } else if (type === 'people') {
    all = mentionsFor(data.people, items).sort((a, b) => a.name.localeCompare(b.name));
  } else if (type === 'sources') {
    const byUrl = new Map();
    for (const i of items) {
      for (const s of i.sources ?? []) {
        const entry = byUrl.get(s.url) ?? { ...s, cites: [] };
        entry.cites.push(i.id);
        byUrl.set(s.url, entry);
      }
    }
    all = [...byUrl.values()].sort((a, b) => String(a.publisher).localeCompare(String(b.publisher)));
  } else {
    all = [];
  }
  const facets = FACETS[type] ?? [];
  const records = all
    .filter((r) => facets.every((f) => !state[f.key] || String(f.of(r) ?? '') === state[f.key]))
    .filter(matches(state.q));
  return { all, records };
}

/** Options for each facet: every value present, with how many records
 *  carry it, so a select never offers a choice that returns nothing. */
export function facetOptions(type, all) {
  return (FACETS[type] ?? []).map((f) => {
    const counts = new Map();
    for (const r of all) {
      const v = f.of(r);
      if (v) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
    }
    const values = [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([value, n]) => ({ value, label: words(value), n }));
    return { ...f, values };
  });
}

/** Which filters are narrowing the view, as plain phrases for the
 *  results line. */
export function activeFilters(state, { desks = [], issues = [], locked = false } = {}) {
  const out = [];
  if (state.region && !locked) out.push(desks.find((d) => d.id === state.region)?.name ?? state.region);
  const issue = issues.find((i) => i.key === state.issue);
  if (issue) out.push(issue.title);
  if (state.start || state.end) out.push(`${state.start || 'beginning'} to ${state.end || 'latest'}`);
  else {
    if (state.year) out.push(state.year);
    if (state.quarters?.length) out.push(state.quarters.map((q) => `Q${q}`).join(' + '));
  }
  for (const f of FACETS[state.type] ?? []) if (state[f.key]) out.push(`${f.label}: ${words(state[f.key])}`);
  if (state.q) out.push(`“${state.q}”`);
  return out;
}
