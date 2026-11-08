import fs from 'node:fs';
import path from 'node:path';
import { splitDocument } from './frontmatter.mjs';
import { renderBody } from './markdown.mjs';

export const TYPES = ['update', 'data', 'summary', 'explainer', 'post', 'article'];
export const BUCKETS = ['overviews', 'overlaps', 'gathering', 'processing', 'packaging', 'publishing'];
export const PIPELINE = ['gathering', 'processing', 'packaging', 'publishing'];
export const STATUSES = ['draft', 'published', 'superseded'];
export const INGREDIENT_KINDS = ['trend', 'characteristic', 'place-asset', 'capital'];

const FIELDS = new Set([
  'title', 'summary', 'date', 'updated', 'author', 'type', 'bucket', 'topic',
  'subcategory', 'places', 'entities', 'tags', 'ingredients', 'status',
  'supersededBy', 'sources', 'licence', 'dataset', 'geography', 'period',
  'units', 'comparable', 'explore', 'theme', 'content_id', 'author_kind', 'featured',
]);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function canonicalPath(slug) {
  return `/pieces/${slug}/`;
}

export function depthOf(bucket) {
  return bucket === 'overviews' || bucket === 'overlaps' ? 'explanatory' : 'technical';
}

/** `topics: null` or `[]` keeps the catalog in content/topics.json.
 *  A list of ids filters that catalog. A list of {id, title} is the subsite's own list. */
export function topicsFor(subsite, catalog) {
  const configured = subsite.topics;
  if (!Array.isArray(configured) || configured.length === 0) return catalog;
  if (typeof configured[0] === 'string') {
    const want = new Set(configured);
    return catalog.filter((topic) => want.has(topic.id));
  }
  return configured.map((topic) => ({ id: topic.id, title: topic.title }));
}

export function extraSections(subsite) {
  return Array.isArray(subsite.sections) ? subsite.sections : [];
}

/** A subsite with `nav` draws its sidebar from that config.
 *  Without it, the sidebar stays Sections plus Topics. */
export function customNav(subsite) {
  return Array.isArray(subsite.nav) ? subsite.nav : [];
}

export function hasCustomNav(subsite) {
  return customNav(subsite).length > 0;
}

export function navGroupSlugs(subsite, groupId) {
  const group = customNav(subsite).find((item) => item.id === groupId);
  return (group?.items ?? []).map((item) => item.slug);
}

export function loadCorpus(root) {
  const geo = readJson(root, 'content/geo.json');
  const topicsDoc = readJson(root, 'content/topics.json');
  const glossaryDoc = readJson(root, 'content/glossary.json');
  const subsiteDir = path.join(root, 'content/subsites');
  const subsites = fs.readdirSync(subsiteDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson(root, path.join('content/subsites', name)));
  const pieces = listMarkdown(root, 'content/pieces');
  const tracked = listMarkdown(root, 'content/posts/items');
  const all = [...pieces, ...tracked];
  const errors = [];
  const seenSlugs = new Set();
  for (const piece of all) {
    if (seenSlugs.has(piece.slug)) errors.push(`duplicate piece slug ${piece.slug}`);
    seenSlugs.add(piece.slug);
  }
  errors.push(...trackingErrors(
    tracked,
    readCsv(root, 'content/posts/created.csv'),
    readCsv(root, 'content/posts/index.csv'),
    readCsv(root, 'content/posts/ideas.csv'),
  ));

  const corpus = {
    root, geo, topics: topicsDoc.topics, glossary: glossaryDoc.terms, subsites, pieces: all,
  };
  for (const subsite of subsites) errors.push(...validateSubsite(subsite));
  for (const piece of all) errors.push(...validatePiece(piece, corpus));
  if (errors.length) {
    const error = new Error(errors.join('\n'));
    error.errors = errors;
    throw error;
  }
  return corpus;
}

function readJson(root, rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function listMarkdown(root, relDir) {
  const dir = path.join(root, relDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => loadMarkdown(root, `${relDir}/${name}`));
}

function loadMarkdown(root, rel) {
  const slug = path.posix.basename(rel, '.md');
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  let parsed;
  try {
    parsed = splitDocument(text);
  } catch (error) {
    const wrapped = new Error(`${rel}: ${error.message}`);
    wrapped.errors = [wrapped.message];
    throw wrapped;
  }
  return { slug, file: rel, data: parsed.data, body: parsed.body };
}

function readCsv(root, rel) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  return parseCsv(text);
}

/** Minimal CSV reader. Quoted fields may contain commas. */
export function parseCsv(text) {
  const src = String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const filled = rows.filter((item) => item.some((value) => value !== ''));
  if (filled.length === 0) return [];
  const [header, ...body] = filled;
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])));
}

/**
 * Item files in content/posts/items/ are the piece source.
 * created.csv and index.csv must name the same file and the same status.
 * A draft stays withheld. published_url is set only when status is published.
 */
export function trackingErrors(items, created, index, ideas) {
  const errors = [];
  const byId = new Map();
  for (const item of items) {
    const id = item.data.content_id;
    if (!id) {
      errors.push(`${item.file}: tracked item needs content_id`);
      continue;
    }
    if (byId.has(id)) errors.push(`${item.file}: duplicate content_id ${id}`);
    byId.set(id, item);
  }
  const createdBy = rowsById(created, 'content_id', 'created.csv', errors);
  const indexBy = rowsById(index, 'content_id', 'index.csv', errors);
  const ideaIds = new Set((ideas ?? []).map((row) => row.idea_id));
  const ids = new Set([...byId.keys(), ...createdBy.keys(), ...indexBy.keys()]);
  for (const id of [...ids].sort()) {
    const item = byId.get(id);
    const createdRow = createdBy.get(id);
    const indexRow = indexBy.get(id);
    if (!item) errors.push(`${id}: listed in the tracker but has no item file`);
    if (!createdRow) errors.push(`${id}: missing from created.csv`);
    if (!indexRow) errors.push(`${id}: missing from index.csv`);
    if (!item || !createdRow || !indexRow) continue;
    if (createdRow.file_path !== item.file) {
      errors.push(`${id}: created.csv file_path is ${createdRow.file_path}, item is ${item.file}`);
    }
    if (indexRow.file_path !== item.file) {
      errors.push(`${id}: index.csv file_path is ${indexRow.file_path}, item is ${item.file}`);
    }
    if (createdRow.idea_id && !ideaIds.has(createdRow.idea_id)) {
      errors.push(`${id}: idea_id ${createdRow.idea_id} is not in ideas.csv`);
    }
    const status = item.data.status;
    if (createdRow.status !== status) {
      errors.push(`${id}: created.csv status ${createdRow.status} does not match front matter ${status}`);
    }
    if (indexRow.status !== status) {
      errors.push(`${id}: index.csv status ${indexRow.status} does not match front matter ${status}`);
    }
    const url = canonicalPath(item.slug);
    if (status === 'published') {
      if (indexRow.published_url !== url) errors.push(`${id}: published_url must be ${url}`);
      if (!DATE.test(createdRow.published_date || '')) errors.push(`${id}: published_date must be YYYY-MM-DD`);
    } else {
      if (indexRow.published_url) errors.push(`${id}: published_url must be blank while status is ${status}`);
      if (createdRow.published_date) errors.push(`${id}: published_date must be blank while status is ${status}`);
    }
  }
  return errors;
}

function rowsById(rows, key, label, errors) {
  const map = new Map();
  for (const row of rows ?? []) {
    const id = row[key];
    if (!id) {
      errors.push(`${label}: a row is missing ${key}`);
      continue;
    }
    if (map.has(id)) errors.push(`${label}: duplicate ${key} ${id}`);
    map.set(id, row);
  }
  return map;
}

function validateSubsite(subsite) {
  const errors = [];
  const fail = (message) => errors.push(`${subsite.slug || subsite.id}: ${message}`);
  const seen = new Set(BUCKETS);
  for (const section of extraSections(subsite)) {
    if (!SLUG.test(section.slug || '')) fail(`section slug "${section.slug}" must be lowercase words separated by hyphens`);
    if (seen.has(section.slug)) fail(`section slug "${section.slug}" collides with another section or a shared bucket`);
    seen.add(section.slug);
    if (typeof section.title !== 'string' || !section.title.trim()) fail(`section ${section.slug} needs a title`);
  }
  for (const topic of topicsFor(subsite, [])) {
    if (!SLUG.test(topic.id || '')) fail(`topic id "${topic.id}" must be lowercase words separated by hyphens`);
    if (typeof topic.title !== 'string' || !topic.title.trim()) fail(`topic ${topic.id} needs a title`);
  }
  const itemSlugs = new Set();
  for (const group of customNav(subsite)) {
    if (!SLUG.test(group.id || '')) fail(`nav group id "${group.id}" must be lowercase words separated by hyphens`);
    if (typeof group.title !== 'string' || !group.title.trim()) fail(`nav group ${group.id} needs a title`);
    for (const item of group.items ?? []) {
      if (!SLUG.test(item.slug || '')) fail(`nav item slug "${item.slug}" must be lowercase words separated by hyphens`);
      if (itemSlugs.has(item.slug)) fail(`nav item slug "${item.slug}" is repeated`);
      itemSlugs.add(item.slug);
      if (typeof item.title !== 'string' || !item.title.trim()) fail(`nav item ${item.slug} needs a title`);
    }
  }
  return errors;
}

export function validatePiece(piece, corpus) {
  const errors = [];
  const { data, file, slug } = piece;
  const fail = (message) => errors.push(`${file}: ${message}`);

  if (!SLUG.test(slug)) fail(`filename slug "${slug}" must be lowercase words separated by hyphens`);
  for (const key of Object.keys(data)) {
    if (!FIELDS.has(key)) fail(`unknown field ${key}`);
  }
  for (const key of ['title', 'summary', 'date', 'updated', 'author', 'type', 'bucket', 'status']) {
    if (typeof data[key] !== 'string' || data[key].trim() === '') fail(`missing ${key}`);
  }
  if (data.author && data.author.includes('@')) fail('author must be a name, not a contact address');
  if (data.content_id !== undefined && !/^HM-\d{4}$/.test(data.content_id)) {
    fail('content_id must look like HM-0001');
  }
  if (data.author_kind !== undefined && data.author_kind !== 'agent' && data.author_kind !== 'human') {
    fail('author_kind must be agent or human');
  }
  if (data.featured !== undefined && typeof data.featured !== 'boolean') {
    fail('featured must be true or false');
  }
  if (data.date && !DATE.test(data.date)) fail('date must be YYYY-MM-DD');
  if (data.updated && !DATE.test(data.updated)) fail('updated must be YYYY-MM-DD');
  if (data.type && !TYPES.includes(data.type)) fail(`type must be one of ${TYPES.join(', ')}`);
  if (data.status && !STATUSES.includes(data.status)) fail(`status must be one of ${STATUSES.join(', ')}`);
  if (data.status === 'superseded' && (typeof data.supersededBy !== 'string' || !data.supersededBy.trim())) {
    fail('supersededBy is required when status is superseded');
  }

  const homes = corpus.subsites.filter((subsite) => pieceInSubsite(piece, subsite, corpus.geo));
  const topicLists = homes.length
    ? homes.map((subsite) => topicsFor(subsite, corpus.topics))
    : [corpus.topics];
  const knownTopic = (id) => topicLists.some((list) => list.some((topic) => topic.id === id));
  const allowedBuckets = new Set([
    ...BUCKETS,
    ...homes.flatMap((subsite) => extraSections(subsite).map((section) => section.slug)),
  ]);

  if (data.bucket && !allowedBuckets.has(data.bucket)) {
    fail(`bucket must be one of ${[...allowedBuckets].join(', ')}`);
  }
  const exploreSlugs = new Set(homes.flatMap((subsite) => navGroupSlugs(subsite, 'explore')));
  const themeSlugs = new Set(homes.flatMap((subsite) => navGroupSlugs(subsite, 'themes')));
  if (data.explore !== undefined && (typeof data.explore !== 'string' || !exploreSlugs.has(data.explore))) {
    fail(`explore must be one of ${[...exploreSlugs].join(', ') || '(no Explore group on this subsite)'}`);
  }
  if (data.theme !== undefined && (typeof data.theme !== 'string' || !themeSlugs.has(data.theme))) {
    fail(`theme must be one of ${[...themeSlugs].join(', ') || '(no Themes group on this subsite)'}`);
  }
  if (data.bucket === 'overviews') {
    if (typeof data.topic !== 'string' || !knownTopic(data.topic)) {
      fail('Overviews pieces need a topic id from this subsite\'s topic list');
    }
  } else if (data.topic !== undefined && !knownTopic(data.topic)) {
    fail(`unknown topic ${data.topic}`);
  }

  if (!Array.isArray(data.places) || data.places.length === 0 || data.places.some((id) => typeof id !== 'string' || !id)) {
    fail('places must list at least one place id or region id');
  } else {
    for (const id of data.places) {
      if (!knownPlace(corpus.geo, id)) fail(`unknown place or region id ${id}`);
    }
  }

  if (data.entities !== undefined && !stringList(data.entities)) fail('entities must be a list of ids');
  if (data.tags !== undefined && !stringList(data.tags)) fail('tags must be a list of labels');

  if (PIPELINE.includes(data.bucket) && data.subcategory !== undefined) {
    const allowed = new Set(homes.flatMap((subsite) => (subsite.pipeline?.[data.bucket] ?? []).map((item) => item.slug)));
    if (!allowed.has(data.subcategory)) fail(`subcategory "${data.subcategory}" is not one of this subsite's ${data.bucket} subcategories`);
  }
  if (data.bucket === 'overlaps') {
    if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) fail('an overlap needs ingredients');
    else {
      for (const item of data.ingredients) {
        if (!item || !INGREDIENT_KINDS.includes(item.kind) || typeof item.ref !== 'string' || !item.ref) {
          fail('each ingredient needs a kind and a ref');
        }
      }
    }
  } else if (data.ingredients !== undefined) {
    fail('ingredients belong on overlaps only');
  }

  if (data.type === 'data' || data.bucket === 'overlaps') {
    if (!Array.isArray(data.sources) || data.sources.length === 0) fail('sources are required');
  }
  if (data.sources !== undefined) {
    if (!Array.isArray(data.sources)) fail('sources must be a list');
    else {
      for (const source of data.sources) {
        if (!source || typeof source.name !== 'string' || !source.name.trim()) fail('each source needs a name');
        if (source.locator !== undefined && !/^https?:\/\//i.test(source.locator)) fail(`source locator must be an http(s) URL`);
        if (source.retrieved !== undefined && !DATE.test(source.retrieved)) fail('source retrieved must be YYYY-MM-DD');
      }
    }
  }

  if (data.type === 'data') {
    for (const key of ['licence', 'dataset', 'geography', 'period', 'units']) {
      if (typeof data[key] !== 'string' || !data[key].trim()) fail(`data pieces need ${key}`);
    }
    if (typeof data.comparable !== 'boolean') fail('data pieces need comparable: true or false');
  }

  if (errors.length === 0) {
    try {
      renderBody(piece.body, {
        glossary: new Map(corpus.glossary.map((term) => [term.id, term])),
        regionIds: [...new Set(homes.flatMap((subsite) => subsite.regions))],
      });
    } catch (error) {
      fail(error.message);
    }
  }
  return errors;
}

function stringList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function knownPlace(geo, id) {
  return geo.places.some((place) => place.id === id) || geo.regions.some((region) => region.id === id);
}

export function pieceInSubsite(piece, subsite, geo) {
  const places = new Map(geo.places.map((place) => [place.id, place]));
  const regions = new Map(geo.regions.map((region) => [region.id, region]));
  for (const id of piece.data.places ?? []) {
    if (subsite.regions.includes(id)) return true;
    for (const regionId of subsite.regions) {
      const region = regions.get(regionId);
      if (region && placeInRegion(id, region, places)) return true;
    }
  }
  return false;
}

export function placeInRegion(placeId, region, placesById) {
  const seen = new Set();
  let id = placeId;
  while (id && !seen.has(id)) {
    seen.add(id);
    if (region.members.includes(id)) return true;
    const place = placesById.get(id);
    if (!place) return false;
    id = place.parent || null;
  }
  return false;
}

export function publicPieces(pieces) {
  return pieces.filter((piece) => piece.data.status === 'published');
}

/** Two published pieces can sit side by side when they share a global topic.
 *  A data piece also needs comparable data in the same units and geography. */
export function canCompare(a, b) {
  if (!a.data.topic || a.data.topic !== b.data.topic) return false;
  const data = a.data.type === 'data' || b.data.type === 'data';
  if (!data) return true;
  return a.data.type === 'data' && b.data.type === 'data'
    && a.data.comparable === true && b.data.comparable === true
    && a.data.units === b.data.units
    && a.data.geography === b.data.geography;
}

export function ingredientKey(piece) {
  return (piece.data.ingredients ?? [])
    .map((item) => `${item.kind}:${item.ref}`)
    .sort()
    .join('|');
}

export function subsitePieces(subsite, pieces, geo) {
  return publicPieces(pieces).filter((piece) => pieceInSubsite(piece, subsite, geo));
}
