import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LANES, STAGES, FLAGS, publishable, byNewest, flagText, moneyLines, corridorPosition, corridorMarks,
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

test('the money list takes production amounts only, never ceilings', () => {
  const ids = moneyLines(publishable(sample.items)).map((i) => i.id);
  assert.deepEqual(ids, ['S1', 'S2']);  // S3 developing, S5 ceiling, S8 corridor
});

test('conflicting values render side by side with their sources', () => {
  const html = renderItem(publishable(sample.items).find((i) => i.id === 'S4'));
  assert.match(html, /approximately 85 jobs/);
  assert.match(html, /60 persons/);
  assert.match(html, /example\.com/);
  assert.match(html, /example\.org/);
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
    flags: [{ type: '<u>', detail: '' }], conflicts: [{ field: 'f', value: '<q>', source_url: 'javascript:x', source_label: '<em>' }],
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
