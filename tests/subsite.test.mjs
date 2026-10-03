import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { splitDocument } from '../scripts/subsite/frontmatter.mjs';
import { renderBody } from '../scripts/subsite/markdown.mjs';
import {
  canCompare, canonicalPath, depthOf, loadCorpus, pieceInSubsite, placeInRegion, publicPieces, validatePiece,
} from '../scripts/subsite/model.mjs';
import { pages } from '../scripts/subsite/render.mjs';
import { pieceVisible, selectedStage, selectedType, stageVisible } from '../assets/js/subsite.js';

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
  assert.equal(corpus.pieces.length, 19);
  for (const piece of corpus.pieces) {
    assert.equal(piece.data.status, 'draft', piece.file);
    assert.match(piece.data.title, /^Example:/);
  }
  assert.ok(corpus.pieces.some((piece) => piece.slug === 'example-update'));
  assert.ok(corpus.pieces.some((piece) => piece.slug === 'heavymap-example-claims'));
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
  assert.equal(selectedStage('?stage=gathering'), 'gathering');
  assert.equal(selectedStage(''), '');
  assert.equal(stageVisible('gathering', ''), true);
  assert.equal(stageVisible('gathering', 'gathering'), true);
  assert.equal(stageVisible('publishing', 'gathering'), false);
});

test('Greater Niagara sidebar is Explore, Themes, Stories, and Methods', () => {
  const corpus = loadCorpus(root);
  const planned = pages(corpus);
  const landing = planned.find((item) => item.path === 'site/greater-niagara/index.html');
  const nav = landing.html.slice(
    landing.html.indexOf('<nav class="subsite-nav"'),
    landing.html.indexOf('</nav>') + 6,
  );
  for (const [id, title] of [
    ['explore', 'Explore'],
    ['themes', 'Themes'],
    ['stories', 'Stories'],
    ['methods', 'Methods'],
  ]) {
    assert.match(nav, new RegExp(`aria-labelledby="subsite-${id}-greater-niagara"`));
    assert.match(nav, new RegExp(`id="subsite-${id}-greater-niagara"[^>]*>${title}<`));
  }
  for (const label of [
    'Companies', 'People and organizations', 'Hubs and funders', 'Places',
    'Sectors and supply chains', 'Investment and funding', 'Workforce and training',
    'Technology and innovation', 'Cross-border links', 'Agriculture and food',
    'Updates', 'Overlaps', 'Explainers', 'Methods',
  ]) {
    assert.match(nav, new RegExp(`>${label}</a>`));
  }
  assert.doesNotMatch(nav, /Overviews|Gathering|Processing|Packaging|Publishing|Manufacturing and supply chains/);
  assert.doesNotMatch(nav, /Municipal records|Company directories/);
  const lists = [...nav.matchAll(/<ul[\s\S]*?<\/ul>/g)].map((match) => match[0]);
  assert.equal(lists.length, 4);
  for (const list of lists) assert.equal((list.match(/<ul/g) || []).length, 1);

  assert.equal(planned.find((item) => item.path === 'site/greater-niagara/overviews/index.html'), undefined);
  assert.equal(planned.find((item) => item.path === 'site/greater-niagara/gathering/index.html'), undefined);

  const methods = planned.find((item) => item.path === 'site/greater-niagara/methods/index.html');
  assert.match(methods.html, /href="\/site\/greater-niagara\/methods\/" aria-current="page"/);
  for (const stage of ['gathering', 'processing', 'packaging', 'publishing']) {
    assert.match(methods.html, new RegExp(`data-stage-group="${stage}"`));
    assert.match(methods.html, new RegExp(`data-stage-filter="${stage}"`));
  }
  assert.match(methods.html, /Municipal records/);
  assert.match(methods.html, /Company directories/);
  const methodsNav = methods.html.slice(methods.html.indexOf('<nav class="subsite-nav"'), methods.html.indexOf('</nav>') + 6);
  assert.doesNotMatch(methodsNav, /Municipal records|Gathering/);

  const gathering = corpus.pieces.find((piece) => piece.slug === 'example-gathering');
  assert.equal(gathering.data.bucket, 'gathering');
  assert.equal(gathering.data.subcategory, 'municipal-records');
});

test('HeavyMap keeps the default sidebar and Greater Niagara uses its own', () => {
  const corpus = loadCorpus(root);
  const heavy = corpus.subsites.find((item) => item.slug === 'heavymap');
  assert.equal(heavy.title, 'HeavyMap');
  assert.equal(heavy.landing, '/site/heavymap/');
  assert.equal(heavy.topics.length, 9);
  assert.equal(heavy.sections.length, 6);
  assert.equal(heavy.pipeline.gathering.length, 3);
  const places = new Map(corpus.geo.places.map((place) => [place.id, place]));
  const region = corpus.geo.regions.find((item) => item.id === 'region:heavymap');
  assert.equal(placeInRegion('town:buffalo', region, places), true);
  assert.equal(placeInRegion('municipality:hamilton', region, places), false);
  assert.equal(placeInRegion('town:rochester', region, places), false);
  const overlap = corpus.pieces.find((piece) => piece.slug.startsWith('heavymap-') && piece.data.bucket === 'overlaps');
  assert.equal(overlap, undefined);

  const planned = pages(corpus);
  const gn = planned.find((item) => item.path === 'site/greater-niagara/index.html').html;
  const gnNav = gn.slice(gn.indexOf('<nav class="subsite-nav"'), gn.indexOf('</nav>') + 6);
  assert.doesNotMatch(gnNav, /Zoning and land use|Layers and data catalogue|HeavyMap/);
  assert.match(gnNav, />Companies</);
  assert.match(gnNav, />Agriculture and food</);
  assert.doesNotMatch(gnNav, />Overviews</);

  const landing = planned.find((item) => item.path === 'site/heavymap/index.html');
  assert.match(landing.html, /href="\/site\/heavymap\/layers\/"/);
  assert.match(landing.html, /Zoning and land use/);
  assert.doesNotMatch(landing.html, /Manufacturing and supply chains/);
  const hmNav = landing.html.slice(landing.html.indexOf('<nav class="subsite-nav"'), landing.html.indexOf('</nav>') + 6);
  assert.doesNotMatch(hmNav, /Recon and source registry|not_in_coverage/);

  const overlaps = planned.find((item) => item.path === 'site/heavymap/overlaps/index.html').html;
  assert.match(overlaps, /not a list of data-derived overlap rules/);
  assert.doesNotMatch(overlaps, /kind: trend|not_in_coverage/);

  const claims = planned.find((item) => item.path === 'site/heavymap/claims-and-refusals/index.html').html;
  assert.match(claims, /not_in_coverage/);
  assert.match(claims, /not_licensed/);
  assert.match(claims, /not_joined/);
  assert.match(claims, /does not list them/);

  const status = planned.find((item) => item.path === 'site/heavymap/status/index.html').html;
  assert.match(status, /Numbered gates are not defined/);
  assert.doesNotMatch(status, /G[1-6]/);

  const gathering = planned.find((item) => item.path === 'site/heavymap/gathering/index.html').html;
  assert.match(gathering, /Recon and source registry/);
  assert.match(gathering, /Licence triage/);
  const gatheringNav = gathering.slice(gathering.indexOf('<nav class="subsite-nav"'), gathering.indexOf('</nav>') + 6);
  assert.doesNotMatch(gatheringNav, /Recon and source registry/);

  for (const item of planned) {
    assert.doesNotMatch(item.html, /Example:/);
    assert.doesNotMatch(item.path, /^pieces\/heavymap-/);
  }
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

test('content posts stay out of the build and the five drafts validate', () => {
  const corpus = loadCorpus(root);
  assert.equal(corpus.pieces.some((piece) => piece.data.content_id), false);
  const planned = pages(corpus);
  const html = planned.map((item) => item.html).join('\n');
  assert.doesNotMatch(html, /HM-0001|licence_clearance|retain-and-mask/);

  const dir = path.join(root, 'content/posts/items');
  const names = fs.readdirSync(dir).filter((name) => name.endsWith('.md')).sort();
  assert.equal(names.length, 5);
  for (const name of names) {
    const parsed = splitDocument(fs.readFileSync(path.join(dir, name), 'utf8'));
    const slug = name.slice(0, -3);
    const errors = validatePiece({
      slug,
      file: name,
      data: parsed.data,
      body: parsed.body,
    }, corpus);
    assert.deepEqual(errors, [], errors.join('\n'));
    assert.equal(parsed.data.status, 'draft');
    assert.equal(parsed.data.author_kind, 'agent');
    assert.match(parsed.data.content_id, /^HM-000[1-5]$/);
    assert.equal(parsed.data.type === 'post' || parsed.data.type === 'article', false);
    assert.deepEqual(parsed.data.places, ['region:heavymap']);
  }
});
