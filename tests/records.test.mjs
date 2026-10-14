import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readState, writeState, recordsFor, facetOptions, activeFilters, words } from '../assets/js/records.js';

const wny = JSON.parse(readFileSync(new URL('../data/wny.json', import.meta.url)));
const dataset = { desk: { id: 'us-ny-western-new-york', name: 'Western New York', href: '/desks/us/ny/western-new-york/' }, data: wny, issues: [] };
const base = (extra = '') => readState(`?${extra}`);

test('state round-trips through the URL and defaults to news', () => {
  assert.equal(base().type, 'news');
  assert.equal(base('type=bogus').type, 'news');
  const s = base('type=sources&skind=primary&year=2026&quarters=4,3&q=buffalo');
  assert.deepEqual(s.quarters, ['3', '4']);
  assert.equal(new URLSearchParams(writeState(s)).get('skind'), 'primary');
  assert.equal(new URLSearchParams(writeState(s, { locked: true })).get('type'), null);
});

test('a region other than the desk returns nothing', () => {
  assert.equal(recordsFor('news', dataset, base('region=ca-on-niagara-brant')).records.length, 0);
});

test('the period narrows every record type, not only dollar figures', () => {
  const all = recordsFor('companies', dataset, base('type=companies')).records.length;
  const none = recordsFor('companies', dataset, base('type=companies&start=1990-01-01&end=1990-12-31')).records.length;
  assert.ok(all > 0);
  assert.equal(none, 0);
});

test('companies and organizations split the entities between them', () => {
  const c = recordsFor('companies', dataset, base()).all;
  const o = recordsFor('organizations', dataset, base()).all;
  assert.ok(c.every((x) => /company|business division/i.test(x.type)));
  assert.ok(o.every((x) => !/company|business division/i.test(x.type)));
  assert.ok(c.every((x) => x.mentions >= 1));
});

test('a facet filters records and its options only offer values present', () => {
  const { all } = recordsFor('sources', dataset, base('type=sources'));
  const [kind] = facetOptions('sources', all);
  assert.equal(kind.key, 'skind');
  assert.ok(kind.values.every((v) => v.n > 0));
  const primary = recordsFor('sources', dataset, base('type=sources&skind=primary')).records;
  assert.ok(primary.length > 0 && primary.every((s) => s.kind === 'primary'));
});

test('sources are deduplicated by URL and remember who cites them', () => {
  const { all } = recordsFor('sources', dataset, base('type=sources'));
  assert.equal(new Set(all.map((s) => s.url)).size, all.length);
  assert.ok(all.every((s) => s.cites.length >= 1));
});

test('active filters read as plain phrases', () => {
  const s = base('type=news&stage=award&year=2026&quarters=4&q=photonics');
  assert.deepEqual(activeFilters(s), ['2026', 'Q4', 'Stage: Award', '“photonics”']);
  assert.equal(words('facility_expansion'), 'Facility expansion');
});
