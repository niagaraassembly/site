import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { byNewest, recentPosts, renderPostList, renderPlaceList, RECENT_LIMIT } from '../assets/js/research.js';

const data = JSON.parse(readFileSync(new URL('../data/research.json', import.meta.url)));

test('recent shows at most five posts, newest first', () => {
  const posts = Array.from({ length: 8 }, (_, i) => ({ title: `p${i}`, href: '/x/', date: `2026-10-0${i + 1}` }));
  const recent = recentPosts(posts);
  assert.equal(RECENT_LIMIT, 5);
  assert.deepEqual(recent.map((p) => p.title), ['p7', 'p6', 'p5', 'p4', 'p3']);
});

test('posts sharing a date keep their data order', () => {
  const posts = [{ title: 'a', date: '2026-10-08' }, { title: 'b', date: '2026-10-08' }, { title: 'c', date: '2026-10-09' }];
  assert.deepEqual(byNewest(posts).map((p) => p.title), ['c', 'a', 'b']);
});

test('rendering escapes text and refuses off-site links', () => {
  const html = renderPostList([{ title: '<img onerror=x>', href: 'javascript:alert(1)', date: '2026-10-08', summary: 'a & b' }]);
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('href="#"'));
  assert.ok(html.includes('a &amp; b'));
  assert.ok(renderPlaceList([{ name: 'X', href: '//evil.example/', summary: '' }]).includes('href="#"'));
});

test('every post names a known place and links within the site', () => {
  const places = new Set(data.places.map((p) => p.id));
  for (const post of data.posts) {
    assert.ok(places.has(post.place), `${post.title} has unknown place ${post.place}`);
    assert.match(post.href, /^\/MAGS\/RESEARCH\//);
    assert.match(post.date, /^\d{4}-\d{2}-\d{2}$/);
  }
});
