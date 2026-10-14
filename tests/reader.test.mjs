import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cycle, startingPoint, neighbours } from '../assets/js/reader.js';
import { isStale, isoDate, build } from '../scripts/reader/build.mjs';

const items = [
  { id: 'a', publication: 'START' }, { id: 'b', publication: 'START' },
  { id: 'c', publication: 'Research' }, { id: 'd', publication: 'START' }
];

test('data/reader.json matches the issues, research posts and desks', () => {
  assert.equal(isStale(), false, 'run: node scripts/reader/build.mjs');
});

test('every item the Reader can open exists on disk', () => {
  for (const item of build()) {
    const path = new URL(`..${item.id}index.html`, import.meta.url);
    assert.doesNotThrow(() => readFileSync(path), item.id);
  }
});

test('read items leave the cycle unless shown, but the open one stays', () => {
  const read = new Set(['b']);
  assert.deepEqual(cycle(items, { read }).map((i) => i.id), ['a', 'c', 'd']);
  assert.deepEqual(cycle(items, { read, showRead: true }).map((i) => i.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(cycle(items, { read, keep: 'b' }).map((i) => i.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(cycle(items, { publication: 'START', read }).map((i) => i.id), ['a', 'd']);
});

test('the Reader starts on the first unread piece, or nothing when caught up', () => {
  assert.equal(startingPoint(items, new Set(['a'])).id, 'b');
  assert.equal(startingPoint(items, new Set(items.map((i) => i.id))), null);
});

test('previous and next stop at the ends', () => {
  assert.deepEqual([neighbours(items, 'a').prev, neighbours(items, 'a').next.id], [null, 'b']);
  assert.equal(neighbours(items, 'd').next, null);
});

test('article dates read in either month style', () => {
  assert.equal(isoDate('Sep 30, 2026 · ~3 min read'), '2026-09-30');
  assert.equal(isoDate('Sept 26, 2026'), '2026-09-26');
  assert.equal(isoDate('no date'), '');
});
