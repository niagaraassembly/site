import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NAV, trailFor, allPaths } from '../assets/js/sitenav.js';

const root = new URL('..', import.meta.url).pathname;

test('every menu path has a page on disk', () => {
  for (const p of allPaths()) {
    assert.ok(fs.existsSync(`${root}${p}index.html`), `missing page for ${p}`);
  }
});

test('menu paths are unique', () => {
  const paths = allPaths();
  assert.equal(new Set(paths).size, paths.length);
});

test('every menu page carries the shared header and no legacy nav', () => {
  for (const p of allPaths()) {
    const html = fs.readFileSync(`${root}${p}index.html`, 'utf8');
    assert.match(html, /<header class="topnav" data-sitenav><\/header>/, p);
    assert.doesNotMatch(html, /topnav__brand/, p);
  }
});

test('the old Membership top-level link is gone from every page', () => {
  for (const f of ['index.html', 'board/index.html', 'company/index.html',
                   'call-for-infrastructures/index.html']) {
    assert.doesNotMatch(fs.readFileSync(`${root}${f}`, 'utf8'), /href="\/membership\/"/, f);
  }
  assert.ok(!fs.existsSync(`${root}membership/index.html`));
});

test('trailFor returns the word and the chain down to the page', () => {
  const t = trailFor('/services/spaces/work/');
  assert.equal(NAV[t.word].word, 'Niagara');
  assert.deepEqual(t.chain.map((i) => i.label), ['Services', 'Spaces', 'Work']);
});

test('the board application shows the Tools > Board trail', () => {
  assert.deepEqual(trailFor('/board/').chain.map((i) => i.label), ['Services', 'Tools', 'Board']);
});

test('the company page is Inc. > Purpose', () => {
  const t = trailFor('/company/');
  assert.equal(NAV[t.word].word, 'Inc.');
  assert.equal(t.chain[0].label, 'Purpose');
});

test('pages outside the menu have no trail', () => {
  assert.equal(trailFor('/'), null);
  assert.equal(trailFor('/call-for-infrastructures/'), null);
});

import { rowsFor, toggle } from '../assets/js/sitenav.js';

const services = NAV[0].items[0];
const spaces = services.items[0];

test('an open word with nothing expanded shows one row', () => {
  const rows = rowsFor(0, []);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].items.map((i) => i.label), ['Services', 'Goods', 'Places']);
  assert.equal(rows[0].active, null);
});

test('expanding an item adds its children as the next row', () => {
  const rows = rowsFor(0, [services, spaces]);
  assert.deepEqual(rows.map((r) => r.active?.label ?? null), ['Services', 'Spaces', null]);
  assert.deepEqual(rows[2].items.map((i) => i.label),
    ['Work', 'Office', 'Event', 'Digital', 'Retail', 'Storage']);
});

test('toggle expands, collapses, and switches siblings', () => {
  assert.deepEqual(toggle([], 0, services), [services]);
  assert.deepEqual(toggle([services], 0, services), []);
  assert.deepEqual(toggle([services, spaces], 1, spaces), [services]);
  const training = services.items[1];
  assert.deepEqual(toggle([services, spaces], 1, training), [services, training]);
});

test('collapsing a parent drops everything beneath it', () => {
  assert.deepEqual(toggle([services, spaces], 0, services), []);
});

test('Clark is the first item under Training', () => {
  const training = NAV[0].items[0].items.find((i) => i.label === 'Training');
  assert.equal(training.items[0].label, 'Clark');
  assert.equal(training.items[0].path, '/services/training/clark/');
});

import { APPS } from '../assets/js/sitenav.js';

test('the Apps panel starts with HeavyMap and every app is complete', () => {
  assert.equal(APPS[0].name, 'HeavyMap');
  assert.equal(APPS[0].href, 'https://heavymap.com');
  assert.equal(APPS[0].icon, '/assets/img/apps/heavymap.png');
  assert.equal(APPS[0].blurb,
    'A creative mapping and industrial intelligence tool for experts and the general public.');
  for (const app of APPS) {
    for (const key of ['name', 'status', 'href', 'label', 'blurb']) {
      assert.ok(app[key], `${app.name ?? '(unnamed)'} is missing ${key}`);
    }
  }
});
