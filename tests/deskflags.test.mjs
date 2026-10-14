import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { statesWithDesks, desksInState, renderStateMenu, renderDeskMenu, renderStateDesks, renderIssueMenu } from '../assets/js/deskflags.js';

const registry = JSON.parse(readFileSync(new URL('../data/desks.json', import.meta.url)));

test('the registry is consistent: every desk names a known state with a page', () => {
  for (const mag of registry.desks) {
    const state = registry.states[mag.state];
    assert.ok(state, `${mag.id} names unknown state ${mag.state}`);
    assert.match(state.href, /^\/desks\/[a-z]{2}\/[a-z]{2}\/$/);
    assert.match(mag.href, /^\/desks\//);
  }
});

test('the country flag lists only states that have a desk', () => {
  const reg = { ...registry, states: { ...registry.states, ohio: { name: 'Ohio', country: 'US', href: '/mags/states/ohio/' } } };
  assert.deepEqual(statesWithDesks(reg, 'US').map((s) => s.slug), ['us-ny']);
  assert.match(renderStateMenu(registry, 'US'), /href="\/desks\/us\/ny\/">New York</);
});

test('the state flag and state page list that state’s desks', () => {
  assert.deepEqual(desksInState(registry, 'us-ny').map((m) => m.id), ['us-ny-western-new-york']);
  assert.match(renderDeskMenu(registry, 'us-ny'), /href="\/desks\/us\/ny\/western-new-york\/">Western New York</);
  assert.match(renderStateDesks(registry, 'us-ny'), /issue-list__title/);
  assert.equal(renderDeskMenu(registry, 'ohio'), '');
});

test('menu links stay on the site and text is escaped', () => {
  const reg = { states: { x: { name: '<b>X</b>', country: 'US', href: 'https://evil.example/' } }, desks: [{ id: 'm', name: 'M', href: '//evil', state: 'x' }] };
  assert.match(renderStateMenu(reg, 'US'), /href="#">&lt;b&gt;X&lt;\/b&gt;/);
  assert.match(renderDeskMenu(reg, 'x'), /href="#"/);
});

test('the issue menu lists a desk’s issues newest first and marks the current one', () => {
  const reg = { desks: [{ id: 'x', href: '/desks/x/', issues: [
    { title: 'Issue One', href: '/desks/x/issue/one/', date: '2026-10-10' },
    { title: 'Issue Two', href: '/desks/x/issue/two/', date: '2026-10-17' }] }] };
  const html = renderIssueMenu(reg, 'x', '/desks/x/issue/one/');
  assert.ok(html.indexOf('Issue Two') < html.indexOf('Issue One'));
  assert.match(html, /href="\/desks\/x\/issue\/one\/" aria-current="page"/);
  assert.match(html, /17 October 2026/);
  assert.match(html, /href="\/desks\/x\/posts\/">All articles/);
  assert.equal(renderIssueMenu(reg, 'missing', '/'), '');
});
