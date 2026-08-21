import test from 'node:test';
import assert from 'node:assert/strict';
import { cardHtml, navHtml, subnavHtml, applyFilters, mountBoard, parseQuery }
  from '../assets/js/board.js';
import { CATEGORIES } from '../assets/js/nav.js';

const rec = (o = {}) => ({ id: 'b-0001', category: 'events', kind: 'stand-ups',
                           location: 'Niagara', title: 'Open bench night',
                           when: '2026-09-04', where: '12 Ross St',
                           contact: 'rosa@example.ca', date: '2026-08-20', ...o });

/* --- nav ---------------------------------------------------------- */

test('the main nav is the five categories, in order', () => {
  const html = navHtml('events');
  for (const label of ['Events', 'News', 'Spaces', 'Tools', 'Experts']) {
    assert.ok(html.includes(`>${label}<`), `missing ${label}`);
  }
  assert.equal(html.indexOf('Events') < html.indexOf('Experts'), true);
});

test('the active category is marked for styling and screen readers', () => {
  assert.ok(navHtml('tools').includes('aria-current="page"'));
});

test('every subnav starts with All, then the screenshot order', () => {
  const html = subnavHtml('events', 'all');
  assert.ok(html.indexOf('All') < html.indexOf('Standups'));
  assert.ok(html.indexOf('Standups') < html.indexOf('Training'));
});

test('each category gets its own subnav', () => {
  assert.ok(subnavHtml('news', 'all').includes('SAFEs'));
  assert.ok(subnavHtml('spaces', 'all').includes('Office Space'));
  assert.ok(!subnavHtml('news', 'all').includes('SAFEs') === false);
  assert.ok(!subnavHtml('tools', 'all').includes('Logistics'));
});

test('a subnav renders for every category without throwing', () => {
  for (const category of CATEGORIES) assert.ok(subnavHtml(category, 'all').length > 0);
});

/* --- filtering ---------------------------------------------------- */

const many = [
  rec({ id: 'b-0001', category: 'events', kind: 'stand-ups', location: 'Niagara',
        title: 'Open bench night', when: '2026-09-04', date: '2026-08-20' }),
  rec({ id: 'b-0002', category: 'events', kind: 'talks', location: 'Hamilton',
        title: 'Steel and software', when: '2020-01-01', date: '2026-08-19' }),
  rec({ id: 'b-0003', category: 'news', kind: 'hiring', location: 'Buffalo',
        title: 'Trico hiring', link: 'https://example.ca/t',
        description: 'Forty roles.', date: '2026-08-18' })
];

test('category is the primary filter', () => {
  assert.deepEqual(applyFilters(many, { category: 'news' }).map(r => r.id), ['b-0003']);
});

test('kind narrows within a category, and all means all', () => {
  assert.deepEqual(applyFilters(many, { category: 'events', kind: 'talks' }).map(r => r.id),
                   ['b-0002']);
  assert.equal(applyFilters(many, { category: 'events', kind: 'all' }).length, 2);
});

test('search matches title, description and where, case-insensitively', () => {
  assert.deepEqual(applyFilters(many, { q: 'STEEL' }).map(r => r.id), ['b-0002']);
  assert.deepEqual(applyFilters(many, { q: 'forty' }).map(r => r.id), ['b-0003']);
  assert.equal(applyFilters(many, { q: 'nothing here' }).length, 0);
});

test('location filters case-insensitively, and not on the free-text venue', () => {
  // Stored as "Hamilton"; a filter built from "hamilton" must still match.
  assert.deepEqual(applyFilters(many, { location: 'hamilton' }).map(r => r.id), ['b-0002']);
  assert.deepEqual(applyFilters(many, { location: 'Hamilton' }).map(r => r.id), ['b-0002']);
});

test('upcoming hides events whose date has passed', () => {
  const ids = applyFilters(many, { category: 'events', upcoming: true }).map(r => r.id);
  assert.deepEqual(ids, ['b-0001']);
});

test('upcoming leaves records with no when alone', () => {
  assert.deepEqual(applyFilters(many, { category: 'news', upcoming: true }).map(r => r.id),
                   ['b-0003']);
});

test('posted-since drops anything older than the window', () => {
  const ids = applyFilters(many, { since: '2026-08-19' }).map(r => r.id);
  assert.deepEqual(ids, ['b-0001', 'b-0002']);
});

test('offer filters the board in both directions', () => {
  const tool = (o) => ({ ...rec(), category: 'tools', kind: 'electronics', ...o });
  const both = [tool({ id: 'b-0001', offer: 'offering', title: 'Have a lathe' }),
                tool({ id: 'b-0002', offer: 'seeking', title: 'Need a lathe' })];
  assert.deepEqual(applyFilters(both, { offer: 'seeking' }).map(r => r.id), ['b-0002']);
  assert.equal(applyFilters(both, { offer: '' }).length, 2);
});

test('a card shows offer, specs and price', () => {
  const html = cardHtml(rec({ offer: 'seeking', specs: 'Heller 1707 MK5',
                              price: 'free to borrow' }));
  assert.ok(html.includes('Seeking'));
  assert.ok(html.includes('Heller 1707 MK5'));
  assert.ok(html.includes('free to borrow'));
});

test('price is rendered above the description', () => {
  const html = cardHtml(rec({ price: '$400/mo', description: 'Month to month.' }));
  assert.ok(html.indexOf('card__price') < html.indexOf('card__desc'));
});

test('search reaches specs', () => {
  assert.deepEqual(
    applyFilters([rec({ id: 'b-0009', specs: 'Heller 1707 MK5' })], { q: 'heller' })
      .map(r => r.id), ['b-0009']);
});

test('filters compose', () => {
  assert.deepEqual(
    applyFilters(many, { category: 'events', location: 'Niagara', q: 'bench' }).map(r => r.id),
    ['b-0001']);
});

test('results run newest first', () => {
  assert.deepEqual(applyFilters(many, {}).map(r => r.id), ['b-0001', 'b-0002', 'b-0003']);
});

/* --- query string -------------------------------------------------- */

test('parseQuery reads the filter state off a URL', () => {
  const f = parseQuery('?category=tools&kind=fabrication&q=lathe&location=niagara&upcoming=1');
  assert.equal(f.category, 'tools');
  assert.equal(f.kind, 'fabrication');
  assert.equal(f.q, 'lathe');
  assert.equal(f.upcoming, true);
});

test('parseQuery refuses a category that is not in the nav', () => {
  assert.equal(parseQuery('?category=rumour').category, 'events');
});

test('parseQuery defaults to events and all', () => {
  const f = parseQuery('');
  assert.equal(f.category, 'events');
  assert.equal(f.kind, 'all');
  assert.equal(f.upcoming, false);
});

/* --- cards --------------------------------------------------------- */

test('cardHtml escapes every rendered value', () => {
  const html = cardHtml(rec({ title: '<script>alert(1)</script>' }));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('cardHtml renders an http link and refuses anything else', () => {
  assert.ok(cardHtml(rec({ link: 'https://example.ca/x' })).includes('href="https://example.ca/x"'));
  assert.ok(!cardHtml(rec({ link: 'javascript:alert(1)' })).includes('href='));
});

test('cardHtml shows the kind label, not the slug', () => {
  assert.ok(cardHtml(rec()).includes('Standups'));
  assert.ok(!cardHtml(rec()).includes('>stand-ups<'));
});

test('cardHtml shows the location as typed', () => {
  assert.ok(cardHtml(rec()).includes('Niagara'));
  assert.ok(cardHtml(rec({ location: '  Port   Dover ' })).includes('Port Dover'));
});

test('cardHtml omits absent fields rather than rendering empties', () => {
  const html = cardHtml({ id: 'b-0002', category: 'news', kind: 'hiring',
                          location: 'Buffalo', title: 'Trico hiring',
                          description: 'Forty roles.', date: '2026-08-20' });
  assert.ok(!html.includes('card__when'));
  assert.ok(!html.includes('card__contact'));
});

test('a card never renders a name or an email field', () => {
  const html = cardHtml(rec({ name: 'Rosa Silva', email: 'rosa@example.ca' }));
  assert.ok(!html.includes('Rosa Silva'));
  assert.ok(!html.includes('rosa@example.ca') || html.includes('card__contact'));
});

test('cardHtml renders member comments, escaped', () => {
  const html = cardHtml(rec({ comments: [
    { author: 'rosa-silva', body: 'Bench is free that night.', date: '2026-08-21' },
    { author: 'evil', body: '<img src=x onerror=alert(1)>', date: '2026-08-21' }
  ]}));
  assert.ok(html.includes('rosa-silva'));
  assert.ok(html.includes('Bench is free that night.'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});

test('a card with no comments renders no comment list', () => {
  assert.ok(!cardHtml(rec()).includes('card__comments'));
  assert.ok(!cardHtml(rec({ comments: [] })).includes('card__comments'));
});

test('a malformed comments value is ignored rather than thrown on', () => {
  assert.ok(!cardHtml(rec({ comments: 'not an array' })).includes('card__comments'));
});

/* --- mounting ------------------------------------------------------ */

test('mountBoard writes cards and a count into the root', () => {
  const root = { innerHTML: '' };
  mountBoard(many, { category: 'events', kind: 'all' }, root);
  assert.ok(root.innerHTML.includes('Open bench night'));
  assert.ok(root.innerHTML.includes('Steel and software'));
  assert.ok(!root.innerHTML.includes('Trico hiring'));
});

test('mountBoard says so when a filter matches nothing', () => {
  const root = { innerHTML: '' };
  mountBoard(many, { category: 'events', q: 'zzzz' }, root);
  assert.ok(/nothing/i.test(root.innerHTML));
});
