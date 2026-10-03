import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from '../../assets/js/escape.js';
import { renderBody } from './markdown.mjs';
import {
  BUCKETS, PIPELINE, TYPES, canonicalPath, extraSections, hasCustomNav, pieceInSubsite, subsitePieces, topicsFor,
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
    if (hasCustomNav(subsite)) {
      for (const group of subsite.nav) {
        for (const item of group.items ?? []) {
          const matched = pieces.filter((piece) => navItemMatches(item, piece));
          out.push(pageFile(
            `site/${subsite.slug}/${item.slug}/index.html`,
            item.stages
              ? methodsPage(subsite, item, matched, corpus)
              : navItemPage(subsite, item, matched, corpus),
            footer,
          ));
        }
      }
    } else {
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
    for (const section of extraSections(subsite)) {
      const inSection = pieces.filter((piece) => piece.data.bucket === section.slug);
      out.push(pageFile(
        `site/${subsite.slug}/${section.slug}/index.html`,
        sectionPage(subsite, section, inSection, corpus),
        footer,
      ));
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
    description: 'Subsites on Niagara Assembly.',
    canonical: '/site/',
    body: `<h1>Subsites</h1>
  <p>Each subsite is a lens: a set of regions, its own topics and sections, and a landing page.</p>
  <ul class="plain">
    ${items}
  </ul>`,
  };
}

function landing(subsite, topics, pieces, corpus) {
  const updates = pieces.filter((piece) => piece.data.type === 'update');
  const featured = pieces.filter((piece) => piece.data.type !== 'update').slice(0, 3);
  const path = `/site/${subsite.slug}/`;
  const termId = subsite.glossaryTerm || 'greater-niagara';
  const defined = renderBody(`:::definition ${termId}\n:::\n`, {
    glossary: new Map(corpus.glossary.map((term) => [term.id, term])),
    regionIds: subsite.regions,
  });
  const focus = subsite.focus
    || 'Industrial sectors are the subject. Agriculture and food is a specialized sector with its own pages, and it is not one of the shared Overview topics.';
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
  <p>${escapeHtml(focus)}</p>

  <h2>Latest updates</h2>
  ${pieceList(updates, 'No published updates yet. Approved updates form a running timeline here.')}

  <h2>Featured</h2>
  ${pieceList(featured, 'No featured pieces yet.')}

  <h2>Start here</h2>
  ${entryList(subsite, topics)}`,
  };
}

function navItemMatches(item, piece) {
  const match = item.match ?? {};
  if (item.stages) return PIPELINE.includes(piece.data.bucket);
  if (match.type && piece.data.type !== match.type) return false;
  if (match.bucket) {
    const buckets = Array.isArray(match.bucket) ? match.bucket : [match.bucket];
    if (!buckets.includes(piece.data.bucket)) return false;
  }
  if (match.excludeBucket && piece.data.bucket === match.excludeBucket) return false;
  if (match.explore && piece.data.explore !== match.explore) return false;
  if (match.theme && piece.data.theme !== match.theme) return false;
  return true;
}

function navItemPage(subsite, item, pieces, corpus) {
  const path = `/site/${subsite.slug}/${item.slug}/`;
  const topics = topicsFor(subsite, corpus.topics);
  const summary = item.summary || '';
  return {
    title: `${item.title} — ${subsite.title}`,
    description: summary,
    canonical: path,
    body: `${nav(subsite, topics, path)}
  <h1>${escapeHtml(item.title)}</h1>
  <p>${escapeHtml(summary)}</p>
  ${typeFilters(path)}
  ${pieceList(pieces, 'No published pieces here yet.')}`,
  };
}

function methodsPage(subsite, item, pieces, corpus) {
  const path = `/site/${subsite.slug}/${item.slug}/`;
  const topics = topicsFor(subsite, corpus.topics);
  const summary = item.summary || '';
  const stages = PIPELINE.map((stage) => stageBlock(subsite, stage, pieces.filter((piece) => piece.data.bucket === stage))).join('\n  ');
  return {
    title: `${item.title} — ${subsite.title}`,
    description: summary,
    canonical: path,
    body: `${nav(subsite, topics, path)}
  <h1>${escapeHtml(item.title)}</h1>
  <p>${escapeHtml(summary)}</p>
  <p class="fineprint">Gathering, processing, packaging, and publishing stay the piece's stage in front matter. This page groups those pieces. It does not put the four stages in the sidebar.</p>
  ${stageFilters(path)}
  ${stages}
  ${typeFilters(path)}`,
  };
}

function stageBlock(subsite, stage, pieces) {
  const names = (subsite.pipeline?.[stage] ?? []).map((sub) => sub.title);
  const label = names.length ? names.join(', ') : 'none';
  return `<section data-stage-group="${stage}">
  <h2>${BUCKET_LABEL[stage]}</h2>
  <p class="fineprint">Seed subcategories: ${escapeHtml(label)}. These names are placeholders, not a survey of sources.</p>
  <div data-piece-block>
  ${pieceList(pieces, 'No published pieces in this stage yet.', stage)}
  </div>
</section>`;
}

function bucketPage(subsite, bucket, topics, pieces, corpus) {
  const path = `/site/${subsite.slug}/${bucket}/`;
  const intro = subsite.bucketPages?.[bucket]?.intro || BUCKET_INTRO[bucket];
  const more = paragraphs(subsite.bucketPages?.[bucket]?.paragraphs);
  const extra = bucket === 'overviews'
    ? topicList(subsite, topics)
    : PIPELINE.includes(bucket)
      ? `${subcategoryList(subsite, bucket)}\n  <p class="fineprint">These subcategory names are seed placeholders, not a survey of this region's sources.</p>`
      : '';
  return {
    title: `${BUCKET_LABEL[bucket]} — ${subsite.title}`,
    description: intro,
    canonical: path,
    body: `${nav(subsite, topics, path)}
  <h1>${BUCKET_LABEL[bucket]}</h1>
  <p>${escapeHtml(intro)}</p>${more ? `\n  ${more}` : ''}
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
  <p class="fineprint">${escapeHtml(subsite.topicNote || 'Shared Overview topic. The list is still a placeholder.')}</p>
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

function sectionPage(subsite, section, pieces, corpus) {
  const path = `/site/${subsite.slug}/${section.slug}/`;
  const topics = topicsFor(subsite, corpus.topics);
  const glossary = section.kind === 'glossary' ? glossaryList(subsite, corpus) : '';
  const roadmap = section.kind === 'roadmap'
    ? '<p class="fineprint">Placeholder. Numbered gates are not defined on this page.</p>'
    : '';
  return {
    title: `${section.title} — ${subsite.title}`,
    description: section.summary,
    canonical: path,
    body: `${nav(subsite, topics, path)}
  <h1>${escapeHtml(section.title)}</h1>
  <p>${escapeHtml(section.summary)}</p>
  ${paragraphs(section.paragraphs)}
  ${roadmap}
  ${glossary}
  ${typeFilters(path)}
  ${pieceList(pieces, 'No published pieces in this section yet.')}`,
  };
}

function glossaryList(subsite, corpus) {
  const terms = corpus.glossary.filter((term) => {
    if (!term.regions || term.regions.length === 0) return true;
    return term.regions.some((id) => subsite.regions.includes(id));
  });
  const items = terms.map((term) =>
    `<li><b>${escapeHtml(term.term)}</b> — ${escapeHtml(term.definition)}</li>`,
  ).join('\n');
  return `<h2>Terms</h2>\n  <ul class="plain">\n    ${items}\n  </ul>`;
}

function paragraphs(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list.map((text) => `<p>${escapeHtml(text)}</p>`).join('\n  ');
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
    BUCKET_LABEL[piece.data.bucket] || piece.data.bucket,
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
  const mark = (href) => {
    if (href === current) return ' aria-current="page"';
    if (href !== `${base}/` && current.startsWith(href)) return ' aria-current="true"';
    return '';
  };
  const link = (href, label) =>
    `<li><a href="${href}"${mark(href)}>${escapeHtml(label)}</a></li>`;
  if (hasCustomNav(subsite)) {
    const groups = subsite.nav.map((group) => {
      const id = `subsite-${group.id}-${subsite.slug}`;
      const items = (group.items ?? []).map((item) => link(`${base}/${item.slug}/`, item.title)).join('\n');
      return `<section class="subsite-nav__group" aria-labelledby="${id}">
    <h2 id="${id}" class="subsite-nav__label">${escapeHtml(group.title)}</h2>
    <ul class="plain">
      ${items}
    </ul>
  </section>`;
    }).join('\n  ');
    return `<nav class="subsite-nav" data-subsite="${escapeHtml(subsite.slug)}" aria-label="${escapeHtml(subsite.title)}">
  <p class="subsite-nav__title"><a href="${base}/"${mark(`${base}/`)}>${escapeHtml(subsite.title)}</a></p>
  ${groups}
</nav>`;
  }
  const sections = [
    ...BUCKETS.map((bucket) => link(`${base}/${bucket}/`, BUCKET_LABEL[bucket])),
    ...extraSections(subsite).map((section) => link(`${base}/${section.slug}/`, section.title)),
  ].join('\n');
  const topicItems = topics.map((topic) =>
    link(`${base}/overviews/${topic.id}/`, topic.title),
  ).join('\n');
  const sectionsId = `subsite-sections-${subsite.slug}`;
  const topicsId = `subsite-topics-${subsite.slug}`;
  return `<nav class="subsite-nav" data-subsite="${escapeHtml(subsite.slug)}" aria-label="${escapeHtml(subsite.title)}">
  <p class="subsite-nav__title"><a href="${base}/"${mark(`${base}/`)}>${escapeHtml(subsite.title)}</a></p>
  <section class="subsite-nav__group" aria-labelledby="${sectionsId}">
    <h2 id="${sectionsId}" class="subsite-nav__label">Sections</h2>
    <ul class="plain">
      ${sections}
    </ul>
  </section>
  <section class="subsite-nav__group" aria-labelledby="${topicsId}">
    <h2 id="${topicsId}" class="subsite-nav__label">Topics</h2>
    <ul class="plain">
      ${topicItems}
    </ul>
  </section>
</nav>`;
}

function entryList(subsite, topics) {
  const base = `/site/${subsite.slug}`;
  if (hasCustomNav(subsite)) {
    return subsite.nav.map((group) => {
      const items = (group.items ?? []).map((item) =>
        `<li><a href="${base}/${item.slug}/">${escapeHtml(item.title)}</a></li>`,
      ).join('\n');
      return `<p><b>${escapeHtml(group.title)}</b></p>\n  <ul class="plain">\n    ${items}\n  </ul>`;
    }).join('\n  ');
  }
  const links = [
    [`${base}/overviews/`, 'Overviews'],
    [`${base}/overlaps/`, 'Overlaps'],
    ...PIPELINE.map((bucket) => [`${base}/${bucket}/`, BUCKET_LABEL[bucket]]),
    ...extraSections(subsite).map((section) => [`${base}/${section.slug}/`, section.title]),
  ];
  const items = links.map(([href, label]) => `<li><a href="${href}">${escapeHtml(label)}</a></li>`).join('\n');
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

function stageFilters(basePath) {
  const links = [['', 'All stages'], ...PIPELINE.map((stage) => [stage, BUCKET_LABEL[stage]])];
  const html = links.map(([id, label]) => {
    const href = id ? `${basePath}?stage=${id}` : basePath;
    return `<a href="${href}" data-stage-filter="${id}">${label}</a>`;
  }).join('\n    ');
  return `<nav class="filters" aria-label="Pipeline stage" data-sketch="box">\n    ${html}\n  </nav>`;
}

function typeFilters(basePath) {
  const links = [['', 'All'], ...TYPES.map((type) => [type, TYPE_LABEL[type]])];
  const html = links.map(([id, label]) => {
    const href = id ? `${basePath}?type=${id}` : basePath;
    return `<a href="${href}" data-type-filter="${id}">${label}</a>`;
  }).join('\n    ');
  return `<nav class="filters" aria-label="Content type" data-sketch="box">\n    ${html}\n  </nav>`;
}

function pieceList(pieces, empty, stage) {
  if (pieces.length === 0) return `<p class="board__empty">${escapeHtml(empty)}</p>`;
  const stageAttr = stage ? ` data-piece-stage="${escapeHtml(stage)}"` : '';
  const items = pieces.map((piece) => `<li data-piece-type="${escapeHtml(piece.data.type)}"${stageAttr}>
      <a href="${canonicalPath(piece.slug)}"><b>${escapeHtml(piece.data.title)}</b></a>
      <span class="card__meta">${metaLine(piece)}</span>
    </li>`).join('\n    ');
  return `<ul class="plain" data-piece-list>\n    ${items}\n  </ul>\n  <p class="board__empty" data-piece-empty hidden>No published pieces of that type.</p>`;
}

function seedBanner(subsite) {
  const labels = hasCustomNav(subsite)
    ? 'the navigation labels and the pipeline stage names'
    : 'the topic list, and the pipeline subcategory names';
  return `<p class="fineprint">Seed data. Places, the region record, ${labels} for ${escapeHtml(subsite.title)} are placeholders for the pipeline, not a finished gazetteer or a survey of sources.</p>`;
}

function byUpdated(a, b) {
  return b.data.updated.localeCompare(a.data.updated) || a.data.title.localeCompare(b.data.title);
}

export { MARKER };
