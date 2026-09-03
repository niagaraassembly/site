/* Renders the board: main nav, subnav, filters and cards.
 *
 * Craigslist's density with a startup-board's structure — one power bar of
 * five categories, one subnav of kinds beneath it, and a persistent
 * search/filter bar that is separate from both.
 *
 * Split from the page so everything except mountBoard is pure and tests
 * without a DOM. mountBoard touches one property.
 *
 * Every value here came from a public form and passed only an EDITORIAL
 * approval gate. Nothing is trusted to be inert; escapeHtml and
 * safeHttpUrl
 * are applied at the point of interpolation, not upstream.
 */

import { escapeHtml, safeHttpUrl } from './escape.js';

import {
  CATEGORIES,
  CATEGORY_LABELS,
  KINDS,
  OFFERS,
  kindLabel,
  normaliseLocation
} from './nav.js';

import {
  attachPostcardButtons
} from './postcard.js';


/* --- nav ----------------------------------------------------------- */

export function navHtml(active) {
  return CATEGORIES.map((category) => {
    const current =
      category === active
        ? ' aria-current="page"'
        : '';

    return `<a class="nav__item" href="?category=${category}"${current}>` +
           `${escapeHtml(CATEGORY_LABELS[category])}</a>`;
  }).join('');
}


/* "All" is prepended here rather than stored in KINDS: it is a view over
   the kinds, never a value a record can hold. */

export function subnavHtml(category, activeKind) {
  const entries = [
    ['all', 'All'],
    ...Object.entries(KINDS[category] ?? {})
  ];

  return entries.map(([slug, label]) => {
    const current =
      slug === (activeKind || 'all')
        ? ' aria-current="true"'
        : '';

    return `<a class="subnav__item" href="?category=${category}&kind=${slug}"${current}>` +
           `${escapeHtml(label)}</a>`;
  }).join('');
}


/* --- filtering ------------------------------------------------------ */

const SEARCHABLE = [
  'title',
  'description',
  'where',
  'presenter',
  'specs'
];


/* Newest first. Dates are plain ISO strings, so a lexical compare is a
   chronological one — and it sidesteps the timezone bug where
   new Date('2026-08-20') is UTC midnight and reads as the 19th here. */

function newestFirst(a, b) {
  const byDate =
    String(b.date ?? '').localeCompare(
      String(a.date ?? '')
    );

  return byDate !== 0
    ? byDate
    : String(b.id ?? '').localeCompare(
        String(a.id ?? '')
      );
}


export function applyFilters(
  records,
  filters = {},
  today = new Date().toISOString().slice(0, 10)
) {
  const q =
    String(filters.q ?? '')
      .trim()
      .toLowerCase();

  return (records ?? [])
    .filter((r) => {

      if (
        filters.category &&
        r.category !== filters.category
      ) {
        return false;
      }

      if (
        filters.kind &&
        filters.kind !== 'all' &&
        r.kind !== filters.kind
      ) {
        return false;
      }

      /* Case-insensitive because the field is free text: someone typing
         "hamilton" must still match a filter built from "Hamilton". */

      if (
        filters.location &&
        normaliseLocation(r.location).toLowerCase() !==
          filters.location.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.offer &&
        r.offer !== filters.offer
      ) {
        return false;
      }

      if (
        filters.since &&
        String(r.date ?? '') < filters.since
      ) {
        return false;
      }

      /* Only prunes records that actually carry a `when`. A news item has
         none and must not vanish because someone ticked "upcoming". */

      if (
        filters.upcoming &&
        r.when &&
        String(r.when).slice(0, 10) < today
      ) {
        return false;
      }

      if (
        q &&
        !SEARCHABLE.some((f) =>
          String(r[f] ?? '')
            .toLowerCase()
            .includes(q)
        )
      ) {
        return false;
      }

      return true;
    })
    .sort(newestFirst);
}


/* --- cards ---------------------------------------------------------- */

export function cardHtml(record) {
  const e = escapeHtml;

  const meta = [
    OFFERS[record.offer],
    kindLabel(record.category, record.kind),
    normaliseLocation(record.location)
  ]
    .filter(Boolean)
    .map(e)
    .join(' &middot; ');

  const rows = [
    `<p class="card__meta">${meta}</p>`
  ];

  if (record.title) {
    rows.push(
      `<h3 class="card__title">${e(record.title)}</h3>`
    );
  }

  if (record.presenter) {
    rows.push(
      record.category === 'shows'
        ? `<p class="card__work"><strong>Work</strong><br>${e(record.presenter)}</p>`
        : `<p class="card__by">${e(record.presenter)}</p>`
     );
  }

  if (record.when) {
    rows.push(
      `<p class="card__when">${e(record.when)}</p>`
    );
  }

  if (record.where) {
    rows.push(
      `<p class="card__where">${e(record.where)}</p>`
    );
  }

  if (record.specs) {
    rows.push(
      record.category === 'shows'
        ? `<p class="card__subject"><strong>Subject</strong><br>${e(record.specs)}</p>`
        : `<p class="card__specs">${e(record.specs)}</p>`
  );
  }

  /* Price sits above the description because it is the field a reader
     decides on before reading anything else. */

  if (record.price) {
    rows.push(
      `<p class="card__price">${e(record.price)}</p>`
    );
  }

  if (record.description) {
    rows.push(
      `<p class="card__desc">${e(record.description)}</p>`
    );
  }

  const url =
    safeHttpUrl(record.link);

  if (url) {
    rows.push(
      `<p class="card__link">` +
      `<a href="${e(url)}" rel="noopener">` +
      `${e(url)}` +
      `</a>` +
      `</p>`
    );
  }

  if (record.contact) {
    rows.push(
      `<p class="card__contact">${e(record.contact)}</p>`
    );
  }

  /* Comments are written by organisation members, but they arrive from a
     public issue thread and are escaped like everything else here. */

  const comments =
    Array.isArray(record.comments)
      ? record.comments
      : [];

  if (comments.length) {
    rows.push(
      `<ul class="card__comments">` +
      comments.map((c) =>
        `<li class="card__comment">` +
          `<span class="card__comment-by">` +
            `${e(c.author)}` +
          `</span>` +
          `<span class="card__comment-body">` +
            `${e(c.body)}` +
          `</span>` +
        `</li>`
      ).join('') +
      `</ul>`
    );
  }

  return (
    `<article class="card" ` +
    `data-sketch="box" ` +
    `data-category="${e(record.category)}">` +
    rows.join('') +
    `</article>`
  );
}


/* --- mounting ------------------------------------------------------- */

export function mountBoard(
  records,
  filters,
  root
) {
  const matched =
    applyFilters(records, filters);

  if (matched.length === 0) {
    root.innerHTML =
      `<p class="board__empty">` +
      `Nothing here yet. ` +
      `Try <a href="?category=${escapeHtml(filters.category ?? 'events')}">` +
      `All` +
      `</a>, ` +
      `or post the first one.` +
      `</p>`;

    return;
  }

  root.innerHTML =
    `<p class="board__count">` +
    `${matched.length} ` +
    `${matched.length === 1 ? 'listing' : 'listings'}` +
    `</p>` +
    matched.map(cardHtml).join('');

  /*
   * The cards were rendered from `matched` in exactly this order.
   * Therefore the NodeList and the records have a one-to-one positional
   * correspondence. This avoids searching the DOM by title or other
   * user-supplied text.
   */

  const cards =
    root.querySelectorAll('.card');

  matched.forEach((record, index) => {
    attachPostcardButtons(
      cards[index],
      record
    );
  });
}


/* --- query parsing -------------------------------------------------- */

export function parseQuery(search = location.search) {
  const params =
    new URLSearchParams(search);

  const category =
    params.get('category') || 'events';

  const rawKind =
    params.get('kind') || 'all';

  const kind =
    rawKind === 'all'
      ? ''
      : rawKind;

  const q =
    params.get('q') || '';

  const offer =
    params.get('offer') || '';

  const locationValue =
    params.get('location') || '';

  const since =
    params.get('since') || '';

  const upcoming =
    params.get('upcoming') === '1';

  return {
    category,
    kind,
    q,
    offer,
    location: locationValue,
    since,
    upcoming
  };
}