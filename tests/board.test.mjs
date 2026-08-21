import test from 'node:test';
import assert from 'node:assert/strict';
import { TYPE_ORDER, TYPE_LABELS, groupByType, cardHtml, mountBoard }
  from '../assets/js/board.js';

const rec = (o = {}) => ({ id: 'b-0001', type: 'standup', title: 'Open bench night',
                           when: 'Thursday 7pm', where: '12 Ross St',
                           contact: 'rosa@example.ca', date: '2026-08-20', ...o });

test('every board type has a label and a place in the order', () => {
  assert.deepEqual(TYPE_ORDER, ['standup', 'talk', 'demo', 'space', 'news', 'idea']);
  for (const type of TYPE_ORDER) assert.equal(typeof TYPE_LABELS[type], 'string');
});

test('groups follow TYPE_ORDER regardless of input order', () => {
  const groups = groupByType([rec({ type: 'idea', id: 'b-0002' }), rec()]);
  assert.deepEqual(groups.map(g => g.type), ['standup', 'idea']);
});

test('empty groups are omitted', () => {
  assert.deepEqual(groupByType([rec()]).map(g => g.type), ['standup']);
});

test('records within a group run newest first', () => {
  const groups = groupByType([
    rec({ id: 'b-0001', date: '2026-01-01' }),
    rec({ id: 'b-0002', date: '2026-08-01' })
  ]);
  assert.deepEqual(groups[0].records.map(r => r.id), ['b-0002', 'b-0001']);
});

test('records sharing a date fall back to id, newest first', () => {
  const groups = groupByType([rec({ id: 'b-0001' }), rec({ id: 'b-0003' })]);
  assert.deepEqual(groups[0].records.map(r => r.id), ['b-0003', 'b-0001']);
});

test('cardHtml escapes every rendered value', () => {
  const html = cardHtml(rec({ title: '<script>alert(1)</script>' }));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('cardHtml renders an http link and refuses anything else', () => {
  assert.ok(cardHtml(rec({ link: 'https://example.ca/x' })).includes('href="https://example.ca/x"'));
  assert.ok(!cardHtml(rec({ link: 'javascript:alert(1)' })).includes('href='));
});

test('cardHtml omits absent fields rather than rendering empties', () => {
  const html = cardHtml({ id: 'b-0002', type: 'idea', title: 'Shared CMM',
                          description: 'One machine, six shops.', date: '2026-08-20' });
  assert.ok(!html.includes('card__when'));
  assert.ok(!html.includes('card__where'));
  assert.ok(html.includes('Shared CMM'));
});

test('cards carry the sketch hook so rough.js draws their border', () => {
  assert.ok(cardHtml(rec()).includes('data-sketch="box"'));
});

test('mountBoard writes grouped markup into the root', () => {
  const root = { innerHTML: '' };
  mountBoard([rec()], root);
  assert.ok(root.innerHTML.includes(TYPE_LABELS.standup));
  assert.ok(root.innerHTML.includes('Open bench night'));
});

test('mountBoard says so when the board is empty', () => {
  const root = { innerHTML: '' };
  mountBoard([], root);
  assert.ok(/nothing/i.test(root.innerHTML));
});
