import test from 'node:test';
import assert from 'node:assert/strict';
import { build, isStale, thumbFor } from '../scripts/images/build.mjs';

test('data/images.json matches what the articles and credit files say', () => {
  assert.equal(isStale(), false, 'run: node scripts/images/build.mjs');
});

test('article images carry their magazine, issue and article', () => {
  const article = build().filter((i) => i.section === 'Magazines');
  assert.ok(article.length >= 1);
  for (const i of article) {
    assert.ok(i.magazine && i.article && i.article_href.startsWith('/MAGS/'));
    assert.ok(i.credit, `${i.src} has no figcaption credit`);
  }
});

test('Wikimedia originals get a thumbnail; local files stay as they are', () => {
  assert.equal(thumbFor('https://upload.wikimedia.org/wikipedia/commons/e/ea/A.JPG'),
               'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/A.JPG/500px-A.JPG');
  assert.equal(thumbFor('/assets/img/x.jpg'), '/assets/img/x.jpg');
});
