import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from '../../assets/js/escape.js';
import { renderBody } from './markdown.mjs';
import {
  BUCKETS, PIPELINE, TYPES, canonicalPath, pieceInSubsite, subsitePieces,
} from './model.mjs';

const MARKER = '<!-- subsite-build -->';

const BUCKET_LABEL = {
  overviews: 'Overviews',
  overlaps: 'Overlaps',
  gathering: 'Gathering',
  processing: 'Processing',
  packaging: 'Packaging',
  publishing: 'Publishing',
};

const BUCKET_INTRO = {
  overviews: 'The plain picture of this region for a general reader, organized by the shared topic list.',
  overlaps: 'Points where trends, characteristics, place assets, and pools of capital coincide so as to enable action, investment, and growth.',
  gathering: 'Discovering the available data, including difficulties and results.',
  processing: 'What was found, and what is unique or interesting about different datasets.',
  packaging: 'Decisions and techniques used to combine and package the data.',
  publishing: 'The state of what is published, and in what forms.',
};

const TYPE_LABEL = {
  update: 'Updates',
  data: 'Data',
  summary: 'Summaries',
  explainer: 'Explainers',
  post: 'Posts',
  article: 'Articles',
};

export function pages(corpus) {
  const footer = readFooter(corpus.root);
  const out = [];
  out.push(pageFile('site/index.html', subsiteIndex(corpus), footer));
  for (const subsite of corpus.subsites) {
    const pieces = subsitePieces(subsite, corpus.pieces, corpus.geo)
      .sort(byUpdated);
    const topics = topicsFor(subsite, corpus.topics);
    out.push(pageFile(
      `site/${subsite.slug}/index.html`,
      landing(subsite, topics, pieces, corpus),
      footer,
    ));
    for (const bucket of BUCKETS) {
      const bucketPath = `/site/${subsite.slug}/${bucket}/`;
      const inBucket = pieces.filter((piece) => piece.data.bucket === bucket);
      out.push(pageFile(
        `site/${subsite.slug}/${bucket}/index.html`,
        bucketPage(subsite, bucket, topics, inBucket, corpus),
        footer,
      ));
      if (bucket === 'overviews') {
        for (const topic of topics) {
          const inTopic = inBucket.filter((piece) => piece.data.topic === topic.id);
          out.push(pageFile(
            `site/${subsite.slug}/overviews/${topic.id}/index.html`,
            topicPage(subsite, topic, inTopic, corpus),
            footer,
          ));
        }
      }
      if (PIPELINE.includes(bucket)) {
        for (const sub of subsite.pipeline?.[bucket] ?? []) {
          const inSub = inBucket.filter((piece) => piece.data.subcategory === sub.slug);
          out.push(pageFile(
            `site/${subsite.slug}/${bucket}/${sub.slug}/index.html`,
            subcategoryPage(subsite, bucket, sub, inSub, corpus),
            footer,
          ));
        }
      }
    }
  }
  const seen = new Set();
  for (const subsite of corpus.subsites) {
    for (const piece of subsitePieces(subsite, corpus.pieces, corpus.geo)) {
      if (seen.has(piece.slug)) continue;
      seen.add(piece.slug);
      out.push(pageFile(
        `pieces/${piece.slug}/index.html`,
        piecePage(piece, subsite, corpus),
        footer,
      ));
    }
  }
  return out;
}

function pageFile(rel, inner, footer) {
  return { path: rel, html: document(inner, footer) };
}

function document({ title, description, canonical, body }, footer) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — @NiagaraAssembly</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
${MARKER}
<script>try{document.documentElement.dataset.theme=localStorage.getItem('na-theme')||'light'}catch(e){document.documentElement.dataset.theme='light'}</script>
<link rel="stylesheet" href="/assets/css/site.css">
</head>
<body>

<header class="topnav" data-sitenav></header>

<div class="frame" data-sketch="frame">
${body}
</div>

${footer}

<script src="/vendor/rough.min.js" defer></script>
<script src="/assets/js/sketch.js" defer></script>
<script type="module" src="/assets/js/sitenav.js"></script>
<script type="module" src="/assets/js/theme.js"></script>
<script type="module" src="/assets/js/subsite.js"></script>
</body>
</html>
`;
}

function readFooter(root) {
  const html = fs.readFileSync(path.join(root, 'places/hamilton/index.html'), 'utf8');
  const match = html.match(/<footer class="sitefoot">[\s\S]*?<\/footer>/);
  if (!match) throw new Error('shared site footer not found on places/hamilton/index.html');
  return match[0];
}

function subsiteIndex(corpus) {
  const items = corpus.subsites.map((subsite) =>
    `<li><a href="/site/${subsite.slug}/"><b>${escapeHtml(subsite.title)}</b></a> — ${escapeHtml(subsite.summary)}</li>`,
  ).join('\n');
  return {
    title: 'Subsites',
    description: 'Regional industrial profiles on Niagara Assembly.',
    canonical: '/site/',
    body: `<h1>Subsites</h1>
  <p>Each subsite is a lens: a set of regions, an optional topic selection, and a landing page.</p>
  <ul class="plain">
    ${items}
  </ul>`,
  };
}

function landing(subsite, topics, pieces, corpus) {
  const updates = pieces.filter((piece) => piece.data.type === 'update');
  const featured = pieces.filter((piece) => piece.data.type !== 'update').slice(0, 3);
  const path = `/site/${subsite.slug}/`;
  const defined = renderBody(':::definition greater-niagara\n:::\n', {
    glossary: new Map(corpus.glossary.map((term) => [term.id, term])),
    regionIds: subsite.regions,
  });
  return {
    title: subsite.title,
    description: subsite.summary,
    canonical: path,
    body: `${nav(subsite, topics, path)}
  <h1>${escapeHtml(subsite.title)}</h1>
  ${seedBanner(subsite)}
  <p><b>${escapeHtml(subsite.summary)}</b> ${escapeHtml(subsite.why)}</p>
  <p>${escapeHtml(subsite.span)}</p>
  ${defined}
  <p>Industrial sectors are the subject. Agriculture and food is a specialized sector with its own pages, and it is not one of the shared Overview topics.</p>

  <h2>Latest updates</h2>
  ${pieceList(updates, 'No published updates yet. Approved updates form a running timeline here.')}

  <h2>Featured</h2>
  ${pieceList(featured, 'No featured pieces yet.')}

  <h2>Start here</h2>
  ${entryList(subsite, topics)}`,
  };
}

function bucketPage(subsite, bucket, topics, pieces, corpus) {
  const path = `/site/${subsite.slug}/${bucket}/`;
  const extra = bucket === 'overviews'
    ? topicList(subsite, topics)
    : PIPELINE.includes(bucket)
      ? `${subcategoryList(subsite, bucket)}\n  <p class="fineprint">These subcategory names are seed placeholders, not a survey of this region's sources.</p>`
      : '';
  return {
    title: `${BUCKET_LABEL[bucket]} — ${subsite.title}`,
    description: BUCKET_INTRO[bucket],
    canonical: path,
    body: `${nav(subsite, topics, path)}
  <h1>${BUCKET_LABEL[bucket]}</h1>
  <p>${escapeHtml(BUCKET_INTRO[bucket])}</p>
  ${extra}
  ${typeFilters(path)}
  ${pieceList(pieces, 'No published pieces in this bucket yet.')}`,
  };
}

function topicPage(subsite, topic, pieces, corpus) {
  const path = `/site/${subsite.slug}/overviews/${topic.id}/`;
  const topics = topicsFor(subsite, corpus.topics);
  return {
    title: `${topic.title} — ${subsite.title}`,
    description: `${topic.title} in ${subsite.title}.`,
    canonical: path,
    body: `${nav(subsite, topics, path)}
  <h1>${escapeHtml(topic.title)}</h1>
  <p class="fineprint">Shared Overview topic. The list is still a placeholder.</p>
  ${typeFilters(path)}
  ${pieceList(pieces, 'No published pieces on this topic yet.')}`,
  };
}

function subcategoryPage(subsite, bucket, sub, pieces, corpus) {
  const path = `/site/${subsite.slug}/${bucket}/${sub.slug}/`;
  const topics = topicsFor(subsite, corpus.topics);
  return {
    title: `${sub.title} — ${subsite.title}`,
    description: `${sub.title} under ${BUCKET_LABEL[bucket]}.`,
    canonical: path,
    body: `${nav(subsite, topics, path)}
  <h1>${escapeHtml(sub.title)}</h1>
  <p class="fineprint">A local ${escapeHtml(BUCKET_LABEL[bucket])} subcategory for ${escapeHtml(subsite.title)}. Seed placeholder, not a survey of sources.</p>
  ${typeFilters(path)}
  ${pieceList(pieces, 'No published pieces in this subcategory yet.')}`,
  };
}

function piecePage(piece, subsite, corpus) {
  const path = canonicalPath(piece.slug);
  const topics = topicsFor(subsite, corpus.topics);
  const homes = corpus.subsites.filter((item) => pieceInSubsite(piece, item, corpus.geo));
  const regionIds = [...new Set(homes.flatMap((item) => item.regions))];
  const body = renderBody(piece.body, {
    glossary: new Map(corpus.glossary.map((term) => [term.id, term])),
    regionIds,
  });
  const navs = corpus.subsites
    .filter((item) => pieceInSubsite(piece, item, corpus.geo))
    .map((item) => nav(item, topicsFor(item, corpus.topics), path))
    .join('\n');
  return {
    title: piece.data.title,
    description: piece.data.summary,
    canonical: path,
    body: `${navs || nav(subsite, topics, path)}
  <h1>${escapeHtml(piece.data.title)}</h1>
  <p class="card__meta">${metaLine(piece)}</p>
  <p><b>${escapeHtml(piece.data.summary)}</b></p>
  ${body}
  ${dataBlock(piece)}
  ${sourceBlock(piece)}
  <p class="fineprint">Listed on ${listedLinks(piece, corpus)}. This page's address does not change with the subsite.</p>`,
  };
}

function listedLinks(piece, corpus) {
  const homes = corpus.subsites.filter((subsite) => pieceInSubsite(piece, subsite, corpus.geo));
  if (homes.length === 0) return 'no subsite';
  return homes.map((subsite) =>
    `<a href="/site/${subsite.slug}/">${escapeHtml(subsite.title)}</a>`,
  ).join(', ');
}

function metaLine(piece) {
  const bits = [
    labelType(piece.data.type),
    piece.data.status,
    BUCKET_LABEL[piece.data.bucket],
    `updated ${piece.data.updated}`,
  ];
  return bits.map((bit) => escapeHtml(bit)).join(' · ');
}

function labelType(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function dataBlock(piece) {
  if (piece.data.type !== 'data') return '';
  const rows = [
    ['Dataset', piece.data.dataset],
    ['Geography', piece.data.geography],
    ['Period', piece.data.period],
    ['Units', piece.data.units],
    ['Comparable', piece.data.comparable ? 'yes' : 'no'],
    ['Licence', piece.data.licence],
  ];
  const body = rows.map(([name, value]) =>
    `<tr><td><b>${escapeHtml(name)}</b></td><td>${escapeHtml(value)}</td></tr>`,
  ).join('\n');
  const fresh = (piece.data.sources ?? [])
    .map((source) => source.retrieved)
    .filter(Boolean)
    .sort()
    .at(-1);
  return `<h2>The data</h2>
  <div class="tablewrap">
  <table class="data">
    <thead><tr><th>What</th><th>Detail</th></tr></thead>
    <tbody>
      ${body}
    </tbody>
  </table>
  </div>
  <p class="fineprint">Freshness: source retrieved ${fresh ? escapeHtml(fresh) : 'date not recorded'}. Page updated ${escapeHtml(piece.data.updated)}.</p>`;
}

function sourceBlock(piece) {
  const sources = piece.data.sources ?? [];
  if (sources.length === 0) return '';
  const items = sources.map((source) => {
    const loc = source.locator
      ? ` — <a href="${escapeHtml(source.locator)}" rel="noopener">${escapeHtml(source.locator)}</a>`
      : '';
    const when = source.retrieved ? ` Retrieved ${escapeHtml(source.retrieved)}.` : '';
    return `<li><b>${escapeHtml(source.name)}</b>${loc}.${when}</li>`;
  }).join('\n');
  return `<h2>Sources</h2>\n  <ul class="plain">\n    ${items}\n  </ul>`;
}

function nav(subsite, topics, current) {
  const base = `/site/${subsite.slug}`;
  const item = (href, label, children = '') => {
    const currentAttr = href === current ? ' aria-current="page"' : '';
    return `<li><a href="${href}"${currentAttr}>${escapeHtml(label)}</a>${children}</li>`;
  };
  const topicItems = topics.map((topic) =>
    item(`${base}/overviews/${topic.id}/`, topic.title),
  ).join('\n');
  const pipeline = PIPELINE.map((bucket) => {
    const subs = (subsite.pipeline?.[bucket] ?? []).map((sub) =>
      item(`${base}/${bucket}/${sub.slug}/`, sub.title),
    ).join('\n');
    return item(`${base}/${bucket}/`, BUCKET_LABEL[bucket], `\n      <ul class="plain">\n        ${subs}\n      </ul>`);
  }).join('\n');
  return `<nav class="subsite-nav" data-subsite="${escapeHtml(subsite.slug)}" aria-label="${escapeHtml(subsite.title)}">
  <p class="subsite-nav__title"><a href="${base}/">${escapeHtml(subsite.title)}</a></p>
  <ul class="plain">
    ${item(`${base}/overviews/`, 'Overviews', `\n      <ul class="plain">\n        ${topicItems}\n      </ul>`)}
    ${item(`${base}/overlaps/`, 'Overlaps')}
    ${pipeline}
  </ul>
</nav>`;
}

function entryList(subsite, topics) {
  const base = `/site/${subsite.slug}`;
  const links = [
    [`${base}/overviews/`, 'Overviews'],
    [`${base}/overlaps/`, 'Overlaps'],
    ...PIPELINE.map((bucket) => [`${base}/${bucket}/`, BUCKET_LABEL[bucket]]),
  ];
  const items = links.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('\n');
  return `<ul class="plain">\n    ${items}\n  </ul>\n  ${topicList(subsite, topics)}`;
}

function topicList(subsite, topics) {
  const items = topics.map((topic) =>
    `<li><a href="/site/${subsite.slug}/overviews/${topic.id}/">${escapeHtml(topic.title)}</a></li>`,
  ).join('\n');
  return `<ul class="plain">\n    ${items}\n  </ul>`;
}

function subcategoryList(subsite, bucket) {
  const items = (subsite.pipeline?.[bucket] ?? []).map((sub) =>
    `<li><a href="/site/${subsite.slug}/${bucket}/${sub.slug}/">${escapeHtml(sub.title)}</a></li>`,
  ).join('\n');
  return `<ul class="plain">\n    ${items}\n  </ul>`;
}

function typeFilters(basePath) {
  const links = [['', 'All'], ...TYPES.map((type) => [type, TYPE_LABEL[type]])];
  const html = links.map(([id, label]) => {
    const href = id ? `${basePath}?type=${id}` : basePath;
    return `<a href="${href}" data-type-filter="${id}">${label}</a>`;
  }).join('\n    ');
  return `<nav class="filters" aria-label="Content type" data-sketch="box">\n    ${html}\n  </nav>`;
}

function pieceList(pieces, empty) {
  if (pieces.length === 0) return `<p class="board__empty">${escapeHtml(empty)}</p>`;
  const items = pieces.map((piece) => `<li data-piece-type="${escapeHtml(piece.data.type)}">
      <a href="${canonicalPath(piece.slug)}"><b>${escapeHtml(piece.data.title)}</b></a>
      <span class="card__meta">${metaLine(piece)}</span>
    </li>`).join('\n    ');
  return `<ul class="plain" data-piece-list>\n    ${items}\n  </ul>\n  <p class="board__empty" data-piece-empty hidden>No published pieces of that type.</p>`;
}

function seedBanner(subsite) {
  return `<p class="fineprint">Seed data. Places, the region record, the topic list, and the pipeline subcategory names for ${escapeHtml(subsite.title)} are placeholders for the pipeline, not a finished gazetteer or a survey of sources.</p>`;
}

function topicsFor(subsite, topics) {
  if (!Array.isArray(subsite.topics) || subsite.topics.length === 0) return topics;
  const want = new Set(subsite.topics);
  return topics.filter((topic) => want.has(topic.id));
}

function byUpdated(a, b) {
  return b.data.updated.localeCompare(a.data.updated) || a.data.title.localeCompare(b.data.title);
}

export { MARKER };
