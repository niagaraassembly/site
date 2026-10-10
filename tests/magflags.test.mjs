import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { statesWithMags, magsInState, renderStateMenu, renderMagMenu, renderStateMags } from '../assets/js/magflags.js';

const registry = JSON.parse(readFileSync(new URL('../data/mags.json', import.meta.url)));

test('the registry is consistent: every MAG names a known state with a page', () => {
  for (const mag of registry.mags) {
    const state = registry.states[mag.state];
    assert.ok(state, `${mag.id} names unknown state ${mag.state}`);
    assert.match(state.href, /^\/mags\/states\/[a-z-]+\/$/);
    assert.match(mag.href, /^\/MAGS\//);
  }
});

test('the country flag lists only states that have a MAG', () => {
  const reg = { ...registry, states: { ...registry.states, ohio: { name: 'Ohio', country: 'US', href: '/mags/states/ohio/' } } };
  assert.deepEqual(statesWithMags(reg, 'US').map((s) => s.slug), ['new-york']);
  assert.match(renderStateMenu(registry, 'US'), /href="\/mags\/states\/new-york\/">New York</);
});

test('the state flag and state page list that state’s MAGs', () => {
  assert.deepEqual(magsInState(registry, 'new-york').map((m) => m.id), ['wny']);
  assert.match(renderMagMenu(registry, 'new-york'), /href="\/MAGS\/WNY\/">Western New York</);
  assert.match(renderStateMags(registry, 'new-york'), /issue-list__title/);
  assert.equal(renderMagMenu(registry, 'ohio'), '');
});

test('menu links stay on the site and text is escaped', () => {
  const reg = { states: { x: { name: '<b>X</b>', country: 'US', href: 'https://evil.example/' } }, mags: [{ id: 'm', name: 'M', href: '//evil', state: 'x' }] };
  assert.match(renderStateMenu(reg, 'US'), /href="#">&lt;b&gt;X&lt;\/b&gt;/);
  assert.match(renderMagMenu(reg, 'x'), /href="#"/);
});
