import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marginFits, MIN_MARGIN_REM } from '../assets/js/margin.js';

test('a side block goes in the margin once 12rem is free on each side', () => {
  assert.equal(MIN_MARGIN_REM, 12);
  // page width at a 1152px screen is 30rem + 25vw = 768px: (1152 - 768) / 2 = 192px
  assert.equal(marginFits(1152, 768), true);
  assert.equal(marginFits(1140, 765), false);
});

test('a wider frame needs a wider screen for the same margin', () => {
  assert.equal(marginFits(1440, 832), true);   // page width
  assert.equal(marginFits(1440, 1152), false); // homepage width
});

test('the rem size scales the threshold', () => {
  assert.equal(marginFits(1152, 768, 20), false);
});
