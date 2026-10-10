import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GROUPS, publishable, byNewest, groupFor, corridorPosition, corridorMarks,
  formatAmount, companiesInNews, renderItem,
} from '../assets/js/wny.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const sample = read('./fixtures/wny-sample.json');
const live = read('../data/wny.json');
const controlled = [
  'startup_formation', 'capital_investment', 'facility_opening', 'facility_expansion', 'facility_closure',
  'equipment_investment', 'manufacturing_capacity', 'funding_round', 'grant_or_incentive', 'acquisition',
  'divestiture', 'ownership_change', 'major_contract', 'production_partnership', 'research_commercialization',
  'certification', 'workforce_expansion', 'layoff', 'bankruptcy_or_restructuring', 'product_or_process_launch',
  'other_material_update',
];

test('only approved or published records reach the page', () => {
  const shown = publishable(sample.items);
  assert.ok(shown.length > 0);
  assert.ok(shown.every((i) => ['approved', 'published'].includes(i.publish_status)));
  assert.ok(!shown.some((i) => i.id === 'S9'), 'the not_ready sample must be dropped');
  assert.deepEqual(publishable([{ id: 'x' }]), [], 'a record with no status is not publishable');
});

test('every na-research event type belongs to exactly one section', () => {
  for (const type of controlled) {
    const owners = GROUPS.filter((g) => g.types.includes(type));
    assert.equal(owners.length, 1, `${type} is in ${owners.length} groups`);
  }
  assert.equal(groupFor('some_future_type'), 'other');
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
  const html = renderItem({ id: '"><x', headline: '<b>hi</b>', type: 'layoff', sources: [{ url: 'javascript:alert(1)', publisher: '<i>' }] });
  assert.ok(!html.includes('<b>') && !html.includes('<i>') && !html.includes('javascript:'));
  assert.ok(html.includes('<span class="issue-list__title">'), 'no safe URL means no link');
});

test('the published data file holds only publishable records', () => {
  assert.ok(Array.isArray(live.items));
  for (const item of live.items) {
    assert.ok(['approved', 'published'].includes(item.publish_status), `${item.id} is ${item.publish_status}`);
  }
});

test('the sample file is marked fictional', () => {
  assert.match(sample._note, /FICTIONAL/);
});
