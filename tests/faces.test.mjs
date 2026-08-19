import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFace, FACES } from '../assets/js/faces.js';

test('defaults to the statement', () => {
  assert.equal(resolveFace(''), 'statement');
  assert.equal(resolveFace(undefined), 'statement');
  assert.equal(resolveFace('#nonsense'), 'statement');
});

test('resolves a known face, with or without the hash mark', () => {
  assert.equal(resolveFace('#endorsements'), 'endorsements');
  assert.equal(resolveFace('endorsements'), 'endorsements');
  assert.equal(resolveFace('#statement'), 'statement');
});

test('exposes both faces in order', () => {
  assert.deepEqual(FACES, ['statement', 'endorsements']);
});
