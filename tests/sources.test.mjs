import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rootDomain, citations, sourcesIndex, renderSources } from '../assets/js/sources.js';

test('root domains are the registrable part of a host', () => {
  assert.equal(rootDomain('finance.yahoo.com'), 'yahoo.com');
  assert.equal(rootDomain('www.governor.ny.gov'), 'ny.gov');
  assert.equal(rootDomain('news.bbc.co.uk'), 'bbc.co.uk');
  assert.equal(rootDomain('rbj.net'), 'rbj.net');
});

test('the issue’s sources come from stories, conflicts and people, grouped by domain', () => {
  const data = JSON.parse(readFileSync(new URL('../data/wny/issue-one.json', import.meta.url)));
  const index = sourcesIndex(citations(data));
  const roots = index.map((r) => r.root);
  assert.ok(roots.includes('sec.gov') && roots.includes('rbj.net'));
  assert.equal(new Set(roots).size, roots.length, 'one row per domain');
  for (const r of index) assert.ok(r.stories.size >= 1);
  assert.ok(index[0].stories.size >= index.at(-1).stories.size, 'most-cited first');
});

test('rendering escapes text and never links off-site story hrefs from data', () => {
  const index = sourcesIndex([{ url: 'https://example.com/a', publisher: '<b>P</b>', kind: 'primary', item: { id: 'X', headline: '<i>h</i>' } }]);
  const html = renderSources(index);
  assert.ok(!html.includes('<b>') && !html.includes('<i>'));
  assert.match(html, /href="#wny-X"/);
  assert.match(html, /primary source/);
});

test('non-http citations are dropped', () => {
  assert.equal(citations({ items: [{ id: 'A', sources: [{ url: 'javascript:alert(1)' }] }] }).length, 0);
});

import { coverageRank, coverageLabel, groupRegistry, renderRegistry, TYPE_LABELS } from '../assets/js/sources.js';

test('the registry export is well formed and every type has a label', () => {
  const reg = JSON.parse(readFileSync(new URL('../data/sources.json', import.meta.url)));
  assert.ok(reg.sources.length > 0);
  for (const s of reg.sources) {
    assert.ok(TYPE_LABELS[s.type], `${s.name}: unknown type ${s.type}`);
    assert.match(s.domain, /^[a-z0-9.-]+\.[a-z]{2,}/);
  }
});

test('sources group under their most specific coverage', () => {
  const regions = { wny: 'Western New York' };
  assert.deepEqual(['global', 'US', 'US-NY', 'wny'].map((c) => coverageRank(c, regions)), [3, 2, 1, 0]);
  assert.equal(coverageLabel('CA-ON', regions), 'Ontario');
  const groups = groupRegistry([
    { name: 'B', domain: 'b.org', type: 'news', coverage: ['US', 'wny'], cited: false },
    { name: 'A', domain: 'a.org', type: 'mirror', coverage: ['US'], cited: true },
    { name: 'G', domain: 'g.org', type: 'news', coverage: [], cited: false },
  ], regions);
  assert.deepEqual(groups.map((g) => g.label), ['Western New York', 'United States', 'Global']);
  assert.deepEqual(groups[0].sources[0].also, ['United States']);
  const html = renderRegistry(groups);
  assert.match(html, /Mirror <span class="sources__note">\(not an original publisher\)/);
});

test('an unknown source type is escaped, never rendered as markup', () => {
  const html = renderRegistry(groupRegistry([{ name: 'X', domain: 'x.org', type: '<img src=x onerror=alert(1)>', coverage: ['US'], cited: false }], {}));
  assert.ok(!html.includes('<img'));
  assert.match(html, /&lt;img/);
});

test('the site and the exporter agree on the known source types', () => {
  const py = readFileSync(new URL('../scripts/wny/export.py', import.meta.url), 'utf8');
  const block = py.slice(py.indexOf('SOURCE_TYPES = {'), py.indexOf('}', py.indexOf('SOURCE_TYPES = {')));
  const pyTypes = [...block.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(pyTypes, Object.keys(TYPE_LABELS).sort());
});

import { filterRegistry, registryOptions, filterIndex } from '../assets/js/sources.js';

test('registry search and filters combine', () => {
  const regions = { wny: 'Western New York' };
  const sources = [
    { name: 'Buffalo News', domain: 'buffalonews.com', type: 'news', coverage: ['wny'], cited: false },
    { name: 'SEC EDGAR', domain: 'sec.gov', type: 'regulatory_filings', coverage: ['US'], cited: true },
    { name: 'Mirror Site', domain: 'mirror.example', type: 'mirror', coverage: ['US', 'wny'], cited: true },
  ];
  assert.deepEqual(filterRegistry(sources, { q: 'buffalo' }, regions).map((s) => s.name), ['Buffalo News']);
  assert.deepEqual(filterRegistry(sources, { coverage: 'wny' }, regions).map((s) => s.name), ['Buffalo News', 'Mirror Site'], 'any of a source’s areas');
  assert.deepEqual(filterRegistry(sources, { cited: '1', type: 'mirror' }, regions).map((s) => s.name), ['Mirror Site']);
  assert.deepEqual(filterRegistry(sources, { q: 'western new york news' }, regions).map((s) => s.name), ['Buffalo News'], 'coverage and type words are searchable');
  const opts = registryOptions(sources, regions);
  assert.deepEqual(opts.coverage.map(([v]) => v), ['wny', 'US']);
  assert.ok(opts.type.some(([v, l]) => v === 'regulatory_filings' && l === 'Regulatory filings'));
});

test('issue sources filter by search and kind', () => {
  const data = JSON.parse(readFileSync(new URL('../data/wny/issue-one.json', import.meta.url)));
  const index = sourcesIndex(citations(data));
  assert.ok(filterIndex(index, { kind: 'primary source' }).every((r) => r.kinds.has('primary source')));
  assert.deepEqual(filterIndex(index, { q: 'goodyear sec' }).map((r) => r.root), ['sec.gov']);
  assert.equal(filterIndex(index, {}).length, index.length);
});
