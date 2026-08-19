import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voices, needsCollapse, collapse, columns, COLLAPSE_AT } from '../assets/js/endorsements.js';

const withComment = { id:'e-1', name:'Rosa Silva', trade:'Toolmaker', location:'Welland, ON', comment:'Short note.' };
const bare = { id:'e-2', name:'James Okafor', trade:'Controls tech', location:'Lackawanna, NY' };
const blank = { id:'e-3', name:'A', trade:'B', location:'C', comment:'   ' };

test('voices keeps only endorsements with real comment text', () => {
  assert.deepEqual(voices([withComment, bare, blank]).map(e => e.id), ['e-1']);
});

test('short comments are not collapsed', () => {
  assert.equal(needsCollapse('Short note.'), false);
  assert.equal(collapse('Short note.'), 'Short note.');
});

test('long comments collapse on a word boundary with an ellipsis', () => {
  const long = 'word '.repeat(200).trim();
  assert.equal(needsCollapse(long), true);
  const c = collapse(long);
  assert.ok(c.length <= COLLAPSE_AT + 1);
  assert.ok(c.endsWith('…'));
  assert.ok(!c.includes('wor…'));
});

test('columns splits in reading order down each column', () => {
  assert.deepEqual(columns([1,2,3,4,5], 2), [[1,2,3],[4,5]]);
});

test('columns never emits an empty trailing column', () => {
  assert.deepEqual(columns([1], 2), [[1]]);
  assert.deepEqual(columns([], 2), []);
});
