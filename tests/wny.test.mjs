import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LANES, STAGES, FLAGS, publishable, byNewest, flagText, moneyLines, corridorPosition, corridorMarks,
  filterItems, filterOptions, parseFilters, filterQuery, moneyTotals, moneyByStage, renderMoneyTotal, tickerLine,
  moneyGroups, moneyKind, renderMoneyGroups,
  formatAmount, companiesInNews, renderItem, renderCompact,
} from '../assets/js/wny.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const sample = read('./fixtures/wny-sample.json');
const live = read('../data/wny.json');
// na-research research/news/schema/controlled-values.json at 3095263.
const lanes = ['production', 'developing', 'corridor', 'excluded'];
const stages = ['intent', 'application', 'announced', 'approved_plan', 'award', 'under_way', 'completed', 'reported_only'];
const flagTypes = ['conflict', 'gap', 'follow_up', 'company_reported', 'secondary_source',
  'ceiling_not_obligation', 'identity_unresolved', 'research_only', 'not_wny_production'];

test('only approved or published records in a shown lane reach the page', () => {
  const shown = publishable(sample.items);
  assert.ok(shown.length > 0);
  assert.ok(shown.every((i) => ['approved', 'published'].includes(i.publish_status)));
  assert.ok(!shown.some((i) => i.id === 'S9'), 'the not_ready sample must be dropped');
  assert.ok(!shown.some((i) => i.id === 'S10'), 'lane excluded must never render');
  assert.deepEqual(publishable([{ id: 'x', lane: 'production' }]), [], 'no status is not publishable');
});

test('every controlled lane, stage and flag type has fixed wording', () => {
  assert.deepEqual(LANES.map((l) => l.id), lanes.filter((l) => l !== 'excluded'));
  for (const stage of stages) assert.ok(STAGES[stage], `stage ${stage} has no badge`);
  for (const type of flagTypes) assert.ok(FLAGS[type], `flag ${type} has no sentence`);
});

test('flag sentences put details into words', () => {
  assert.deepEqual(flagText({ type: 'conflict', detail: 'local_job_count' }),
                   { tone: 'warn', text: 'Sources disagree on local job count' });
  assert.equal(flagText({ type: 'gap', detail: 'production_location' }).text, 'Production location not disclosed');
  assert.equal(flagText({ type: 'follow_up', detail: 'contractor_identity' }).text, 'Being confirmed: contractor identity');
  assert.equal(flagText({ type: 'brand_new_flag', detail: '' }).text, 'brand new flag');
});

test('the money list takes production amounts only; ceilings never enter it', () => {
  const lines = moneyLines(publishable(sample.items));
  assert.deepEqual(lines.map((i) => i.id), ['S1', 'S2', 'S5']);  // S3 developing, S8 corridor
  assert.equal(lines.find((i) => i.id === 'S5').amount, 2000000, 'the obligated amount, not the 20.7B ceiling');
});

test('the total splits by stage on one line, coloured for completed and announced', () => {
  const lines = moneyLines(publishable(sample.items));
  assert.deepEqual(moneyByStage(lines), [{ currency: 'USD', amount: 126000000, parts: [
    { stage: 'announced', amount: 49000000 }, { stage: 'award', amount: 2000000 }, { stage: 'completed', amount: 75000000 }] }]);
  const html = renderMoneyTotal(lines);
  assert.match(html, /wny-amount--announced">\$49M<\/b> announced/);
  assert.match(html, /wny-amount--done">\$75M<\/b> completed/);
  assert.match(html, /\$2M<\/b> contract or award/);
  assert.match(html, /= <b class="wny-money__sum">\$126M<\/b>/);
});

test('cards colour amounts by stage and label ceilings', () => {
  const items = publishable(sample.items);
  assert.match(renderItem(items.find((i) => i.id === 'S2')), /wny-amount--done">\$75M/);
  assert.match(renderItem(items.find((i) => i.id === 'S1')), /wny-amount--announced">\$49M/);
  const s5 = renderItem(items.find((i) => i.id === 'S5'));
  assert.match(s5, /Contract ceiling \$20\.7B/);
  assert.doesNotMatch(s5, /wny-amount--/, 'award stage stays in ink');
});

test('conflicting values render side by side with their sources', () => {
  const html = renderItem(publishable(sample.items).find((i) => i.id === 'S4'));
  assert.match(html, /Sources disagree on local job count/);
  assert.match(html, /About 85 jobs across two sites/);
  assert.match(html, /60 local jobs/);
  assert.match(html, /Sample Filing/);
  assert.match(html, /Sample Gazette/);
});

test('the explainer shows under the headline; a blank one shows nothing', () => {
  const item = publishable(sample.items).find((i) => i.id === 'S1');
  assert.match(renderItem(item), /Sample explainer/);
  assert.doesNotMatch(renderItem({ ...item, note: '' }), /wny-item__note/);
});

test('compact entries carry no id, so cards keep unique ids', () => {
  assert.doesNotMatch(renderCompact(publishable(sample.items)[0]), /\bid=/);
});

test('newest first, ties keep data order', () => {
  const items = [{ id: 'a', date: '2026-10-06' }, { id: 'b', date: '2026-10-06' }, { id: 'c', date: '2026-10-09' }];
  assert.deepEqual(byNewest(items).map((i) => i.id), ['c', 'a', 'b']);
});

test('the corridor runs Niagara River to Syracuse; off-corridor items are not marked', () => {
  assert.ok(corridorPosition(-79.05) < corridorPosition(-78.88));
  assert.ok(corridorPosition(-77.61) < corridorPosition(-76.15));
  assert.equal(corridorPosition(-73.75), null, 'Albany is east of the line');
  assert.equal(corridorPosition(undefined), null);
  const marks = corridorMarks(publishable(sample.items));
  assert.ok(!marks.some((m) => m.id === 'S8'));
  const rochester = marks.filter((m) => m.item.place === 'Rochester');
  assert.deepEqual(rochester.map((m) => m.stack), [0, 1], 'stories at one place stack');
});

test('amounts read compactly', () => {
  assert.equal(formatAmount(49000000, 'USD'), '$49M');
  assert.equal(formatAmount(20700000000, 'USD'), '$20.7B');
  assert.equal(formatAmount(6000000, 'CAD'), 'C$6M');
  assert.equal(formatAmount('', 'USD'), '');
  assert.equal(formatAmount(0, 'USD'), '');
});

test('companies are counted across approved stories', () => {
  const companies = companiesInNews(publishable(sample.items), sample.entities);
  assert.equal(companies[0].name, 'Example Brands');
  assert.equal(companies[0].count, 2);
});

test('rendering escapes text and refuses script links', () => {
  const html = renderItem({ id: '"><x', headline: '<b>hi</b>', type: 'layoff', lane: 'production', note: '<s>',
    flags: [{ type: '<u>', detail: '' }], conflicts: [{ field: 'f', values: [{ value: '<q>', url: 'javascript:x', source: '<em>' }] }],
    sources: [{ url: 'javascript:alert(1)', publisher: '<i>' }] });
  for (const tag of ['<b>', '<i>', '<s>', '<u>', '<q>', '<em>', 'javascript:']) assert.ok(!html.includes(tag), tag);
  assert.ok(html.includes('<span class="issue-list__title">'), 'no safe URL means no link');
});

test('the published data file holds only publishable records', () => {
  assert.ok(Array.isArray(live.items));
  for (const item of live.items) {
    assert.ok(['approved', 'published'].includes(item.publish_status), `${item.id} is ${item.publish_status}`);
    assert.ok(lanes.includes(item.lane) && item.lane !== 'excluded', `${item.id} lane ${item.lane}`);
    assert.ok(!('summary' in item), `${item.id} must not carry the internal summary`);
  }
});

test('the sample file is marked fictional', () => {
  assert.match(sample._note, /FICTIONAL/);
});

test('search needs every word, across headline, explainer, place, company and sources', () => {
  const items = publishable(sample.items);
  assert.deepEqual(filterItems(items, { q: 'rochester example' }).map((i) => i.id), ['S2', 'S5']);
  assert.deepEqual(filterItems(items, { q: 'SAMPLE TOWN record' }).map((i) => i.id), ['S3'], 'publisher, any case');
  assert.deepEqual(filterItems(items, { q: 'ceiling' }).map((i) => i.id), ['S5'], 'flag wording is searchable');
  assert.equal(filterItems(items, { q: 'nothing-like-this' }).length, 0);
});

test('filters combine', () => {
  const items = publishable(sample.items);
  assert.deepEqual(filterItems(items, { lane: 'corridor' }).map((i) => i.id), ['S7', 'S8']);
  assert.deepEqual(filterItems(items, { flag: 'conflict', lane: 'production' }).map((i) => i.id), ['S1', 'S4']);
  assert.deepEqual(filterItems(items, { stage: 'award', type: 'major_contract' }).map((i) => i.id), ['S5']);
  assert.deepEqual(filterItems(items, { amount: '1', lane: 'production' }).map((i) => i.id), ['S1', 'S2', 'S5']);
  assert.equal(filterItems(items, {}).length, items.length);
});

test('dropdowns offer only values present, labelled from the vocabulary', () => {
  const opts = filterOptions(publishable(sample.items));
  assert.deepEqual(opts.lane.map(([v]) => v), ['production', 'developing', 'corridor']);
  assert.ok(opts.flag.some(([v, label]) => v === 'conflict' && label === 'Sources disagree'));
  assert.ok(!opts.stage.some(([v]) => v === 'reported_only'), 'no item has that stage');
  for (const type of Object.keys(FLAGS)) assert.ok(FLAGS[type].name, `${type} needs a filter name`);
});

test('filter state round-trips through the URL and ignores junk', () => {
  const state = parseFilters('?q=goodyear&lane=production&amount=1&evil=1');
  assert.equal(state.q, 'goodyear');
  assert.equal(state.amount, '1');
  assert.ok(!('evil' in state));
  assert.equal(filterQuery(state), '?q=goodyear&lane=production&amount=1');
  assert.equal(filterQuery(parseFilters('')), '');
  assert.equal(parseFilters('?amount=yes').amount, '');
});

test('front page section headings match the lane labels', () => {
  const html = readFileSync(new URL('../MAGS/WNY/issue/one/index.html', import.meta.url), 'utf8');
  for (const lane of LANES) {
    assert.match(html, new RegExp(`data-wny-lane="${lane.id}"[^>]*>\\s*<h2>${lane.label}</h2>`), lane.id);
  }
});

test('the money total sums the money list, one total per currency', () => {
  assert.deepEqual(moneyTotals(moneyLines(publishable(sample.items))), [{ currency: 'USD', amount: 126000000 }]);
  assert.deepEqual(moneyTotals([{ amount: 5e6, currency: 'USD' }, { amount: 2e6, currency: 'CAD' }, { amount: 1e6 }]),
                   [{ currency: 'USD', amount: 6e6 }, { currency: 'CAD', amount: 2e6 }]);
});

test('the ticker line is place then headline, escaped, linking to the card', () => {
  const html = tickerLine({ id: 'S1', place: '<b>Buffalo</b>', headline: 'Lab <i>expands</i>' });
  assert.match(html, /href="#wny-S1"/);
  assert.ok(!html.includes('<b>') && !html.includes('<i>'));
  assert.doesNotMatch(tickerLine({ id: 'S2', headline: 'No place' }), /wny-ticker__place/);
});

test('dollar figures group by kind of money and never sum across kinds', () => {
  const lines = moneyLines(publishable(sample.items));
  const groups = moneyGroups(lines);
  assert.deepEqual(groups.map((g) => [g.id, g.lines.map((i) => i.id)]),
                   [['building', ['S1']], ['contracts', ['S5']], ['deals', ['S2']]]);
  assert.equal(moneyKind({ amount_type: 'something_new' }), 'other');
  const html = renderMoneyGroups(lines);
  assert.match(html, /Building and equipment/);
  assert.doesNotMatch(html, /wny-money__total/, 'a one-story kind has no total line');
  const two = renderMoneyGroups([...lines, { id: 'S9b', amount: 1e6, currency: 'USD', amount_type: 'award', stage: 'award', headline: 'h' }]);
  assert.match(two, /Contracts total/);
  assert.doesNotMatch(two, /Building and equipment total|Deals total/);
});

test('warning and info markings stay chips; plain ones fold into one sentence', () => {
  const html = renderItem({ id: 'x', headline: 'h', lane: 'production', flags: [
    { type: 'conflict', detail: 'local_job_count' }, { type: 'ceiling_not_obligation', detail: '' },
    { type: 'secondary_source', detail: '' }] });
  assert.match(html, /wny-flag--warn">Sources disagree on local job count/);
  assert.match(html, /wny-flags__plain">Contract ceiling, not money committed or spent\. From a secondary listing; original notice not accessed\.</);
  assert.doesNotMatch(html, /wny-flag--plain/);
});
