import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, safeHttpUrl } from '../assets/js/escape.js';

test('escapes every character that can break out of HTML', () => {
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'),
    '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(escapeHtml(`" & ' <`), '&quot; &amp; &#39; &lt;');
});

test('escapes nullish input to an empty string rather than "undefined"', () => {
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(null), '');
});

test('leaves ordinary venue text alone', () => {
  assert.equal(escapeHtml('Welland Fabrication, 12 Ross St'),
    'Welland Fabrication, 12 Ross St');
});

test('accepts http and https urls', () => {
  assert.equal(safeHttpUrl('https://calendar.google.com/x'), 'https://calendar.google.com/x');
  assert.equal(safeHttpUrl('http://example.ca'), 'http://example.ca');
  assert.equal(safeHttpUrl('HTTPS://EXAMPLE.CA'), 'HTTPS://EXAMPLE.CA');
});

test('rejects script-bearing and unexpected schemes', () => {
  assert.equal(safeHttpUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpUrl('JaVaScRiPt:alert(1)'), null);
  assert.equal(safeHttpUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(safeHttpUrl('/relative/path'), null);
  assert.equal(safeHttpUrl(''), null);
  assert.equal(safeHttpUrl(undefined), null);
});
