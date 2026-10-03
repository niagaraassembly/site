import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { splitDocument } from '../scripts/subsite/frontmatter.mjs';
import { renderBody } from '../scripts/subsite/markdown.mjs';
import {
  canCompare, canonicalPath, depthOf, loadCorpus, pieceInSubsite, placeInRegion, publicPieces,
} from '../scripts/subsite/model.mjs';
import { pages } from '../scripts/subsite/render.mjs';
import { pieceVisible, selectedType } from '../assets/js/subsite.js';

const root = path.resolve(new URL('..', import.meta.url).pathname);

test('front matter keeps place ids intact and reads nested lists', () => {
  const { data, body } = splitDocument(`---
title: "One"
places:
  - town:buffalo
  - region:greater-niagara
ingredients:
  - kind: trend
    ref: topic:trade-and-logistics
comparable: false
entities: []
---
Hello
`);
  assert.deepEqual(data.places, ['town:buffalo', 'region:greater-niagara']);
  assert.equal(data.ingredients[0].ref, 'topic:trade-and-logistics');
  assert.equal(data.comparable, false);
  assert.deepEqual(data.entities, []);
  assert.equal(body.trim(), 'Hello');
});

test('Greater Niagara seed data is labeled seed and is not Niagara Region', () => {
  const geo = JSON.parse(fs.readFileSync(path.join(root, 'content/geo.json'), 'utf8'));
  const subsite = JSON.parse(fs.readFileSync(path.join(root, 'content/subsites/greater-niagara.json'), 'utf8'));
  assert.equal(geo.seed, true);
  assert.equal(subsite.seed, true);
  assert.equal(subsite.slug, 'greater-niagara');
  assert.equal(subsite.title, 'Greater Niagara');
  assert.equal(subsite.landing, '/site/greater-niagara/');
  const region = geo.regions.find((item) => item.id === 'region:greater-niagara');
  assert.ok(region.note.includes('not Niagara Region'));
  const municipality = geo.places.find((item) => item.id === 'municipality:niagara-region');
  assert.equal(municipality.name, 'Niagara Region');
});

test('a town in New York is inside Greater Niagara and Canada is not', () => {
  const corpus = loadCorpus(root);
  const places = new Map(corpus.geo.places.map((place) => [place.id, place]));
  const region = corpus.geo.regions.find((item) => item.id === 'region:greater-niagara');
  assert.equal(placeInRegion('town:buffalo', region, places), true);
  assert.equal(placeInRegion('municipality:hamilton', region, places), true);
  assert.equal(placeInRegion('country:ca', region, places), false);
  const subsite = corpus.subsites[0];
  const inside = corpus.pieces.find((piece) => piece.slug === 'example-update');
  assert.equal(pieceInSubsite(inside, subsite, corpus.geo), true);
  const outside = { data: { places: ['country:ca'] } };
  assert.equal(pieceInSubsite(outside, subsite, corpus.geo), false);
  const tagged = { data: { places: ['region:greater-niagara'] } };
  assert.equal(pieceInSubsite(tagged, subsite, corpus.geo), true);
});

test('every example is a draft and none are published', () => {
  const corpus = loadCorpus(root);
  assert.equal(corpus.pieces.length, 11);
  for (const piece of corpus.pieces) {
    assert.equal(piece.data.status, 'draft', piece.file);
    assert.match(piece.data.title, /^Example:/);
  }
  assert.equal(publicPieces(corpus.pieces).length, 0);
  assert.equal(depthOf('overviews'), 'explanatory');
  assert.equal(depthOf('gathering'), 'technical');
});

test('drafts are absent from generated pages', () => {
  const corpus = loadCorpus(root);
  const planned = pages(corpus);
  const piecePages = planned.filter((item) => item.path.startsWith('pieces/'));
  assert.equal(piecePages.length, 0);
  const landing = planned.find((item) => item.path === 'site/greater-niagara/index.html');
  assert.ok(landing);
  assert.match(landing.html, /Greater Niagara/);
  assert.match(landing.html, /No published updates yet/);
  assert.doesNotMatch(landing.html, /Example:/);
  assert.match(landing.html, /<header class="topnav" data-sitenav><\/header>/);
  assert.match(landing.html, /rel="canonical" href="\/site\/greater-niagara\/"/);
  for (const item of planned) {
    assert.equal(fs.readFileSync(path.join(root, item.path), 'utf8'), item.html, item.path);
    assert.doesNotMatch(item.html, /Example:/);
    assert.doesNotMatch(item.html, /ny-ontario/);
  }
});

test('a published piece gets one canonical URL and can be compared', () => {
  const corpus = loadCorpus(root);
  const draft = corpus.pieces.find((piece) => piece.slug === 'example-data');
  const published = {
    ...draft,
    data: { ...draft.data, status: 'published', comparable: true, topic: 'trade-and-logistics' },
  };
  const other = {
    slug: 'other-region-jobs',
    data: {
      ...published.data,
      title: 'Other region jobs',
      places: ['state:ny'],
    },
    body: draft.body,
  };
  assert.equal(canonicalPath(published.slug), '/pieces/example-data/');
  assert.equal(canCompare(published, other), true);
  const differentUnits = { data: { ...other.data, units: 'establishments' } };
  assert.equal(canCompare(published, differentUnits), false);
  const rendered = pages({ ...corpus, pieces: [published] })
    .find((item) => item.path === 'pieces/example-data/index.html');
  assert.ok(rendered);
  assert.match(rendered.html, /rel="canonical" href="\/pieces\/example-data\/"/);
  assert.match(rendered.html, /data-kind="definition"/);
  assert.match(rendered.html, /Greater Niagara/);
  assert.match(rendered.html, /Example open-data licence/);
  assert.doesNotMatch(rendered.html, /\/site\/greater-niagara\/example-data/);
});

test('margin fences render and reject an unknown glossary id', () => {
  const glossary = new Map([['overlap', { id: 'overlap', term: 'Overlap', definition: 'A coincidence of ingredients.' }]]);
  const html = renderBody('See this.\n\n:::definition overlap\n:::\n', { glossary, regionIds: [] });
  assert.match(html, /data-kind="definition"/);
  assert.match(html, /A coincidence of ingredients/);
  assert.throws(() => renderBody(':::definition missing\n:::\n', { glossary, regionIds: [] }), /unknown glossary id/);
});

test('type filter matches the query and hides other types', () => {
  assert.equal(selectedType('?type=data'), 'data');
  assert.equal(selectedType(''), '');
  assert.equal(pieceVisible('data', ''), true);
  assert.equal(pieceVisible('data', 'data'), true);
  assert.equal(pieceVisible('update', 'data'), false);
});

test('the subsite name is not the retired slug', () => {
  const hits = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (/\.(html|md|json|mjs|js|css)$/.test(entry.name)) {
        if (fs.readFileSync(abs, 'utf8').includes('ny-ontario')) hits.push(path.relative(root, abs));
      }
    }
  };
  for (const dir of ['content', 'site', 'docs', 'scripts', 'assets']) walk(path.join(root, dir));
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  if (readme.includes('ny-ontario')) hits.push('README.md');
  assert.deepEqual(hits, []);
});
