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
  'units', 'comparable',
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

export function loadCorpus(root) {
  const geo = readJson(root, 'content/geo.json');
  const topicsDoc = readJson(root, 'content/topics.json');
  const glossaryDoc = readJson(root, 'content/glossary.json');
  const subsiteDir = path.join(root, 'content/subsites');
  const subsites = fs.readdirSync(subsiteDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson(root, path.join('content/subsites', name)));
  const pieceDir = path.join(root, 'content/pieces');
  const pieces = fs.readdirSync(pieceDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => loadPiece(root, name));

  const corpus = {
    root, geo, topics: topicsDoc.topics, glossary: glossaryDoc.terms, subsites, pieces,
  };
  const errors = [];
  for (const subsite of subsites) errors.push(...validateSubsite(subsite));
  for (const piece of pieces) errors.push(...validatePiece(piece, corpus));
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

function loadPiece(root, name) {
  const slug = name.slice(0, -3);
  const text = fs.readFileSync(path.join(root, 'content/pieces', name), 'utf8');
  let parsed;
  try {
    parsed = splitDocument(text);
  } catch (error) {
    const wrapped = new Error(`${name}: ${error.message}`);
    wrapped.errors = [wrapped.message];
    throw wrapped;
  }
  return { slug, file: name, data: parsed.data, body: parsed.body };
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
