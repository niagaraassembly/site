/* The board's two-level navigation, and the single source of truth for
 * what a record may be.
 *
 * Two levels rather than one flat type list, because the subnav labels
 * are not unique: "Warehouse" appears under both Spaces and Tools, and
 * Electronics, Fabrication and Manufacturing appear under both Tools and
 * Experts. A record needs `category` AND `kind` — one field could not
 * tell a warehouse space from a warehouse tool.
 *
 * Imported by assets/js/submit.js, assets/js/board.js and the pages.
 * scripts/approve_request.py mirrors CATEGORIES and REQUIRED; the test
 * suites on both sides assert they still agree.
 */

export const CATEGORIES = ['events', 'news', 'spaces', 'tools', 'experts', 'shows'];

export const CATEGORY_LABELS = {
  events:  'Events',
  news:    'News',
  spaces:  'Spaces',
  tools:   'Tools',
  experts: 'Experts',
  shows:    'Shows'
};

/* Slug -> visible label, in the screenshot's order. "All" is prepended by
   the page, not stored here — it is a view, never a value a record holds. */
/* Keys are the EXACT option values in the live Board form's Kind
   question — they are what actually arrives, so they are what we store.
   Values are the display labels from the nav screenshot.

   The Kind question holds one de-duplicated list of 25 options; the
   category decides which subset is legal. That is why a record needs both
   levels: "warehouse" is a Spaces kind and a Tools kind, "electronics" is
   a Tools kind and an Experts kind, and "events" is a Spaces kind that
   happens to share a word with a category. */
export const KINDS = {
  events: {
    'stand-ups': 'Standups',
    'talks':     'Talks',
    'demos':     'Demos',
    'launches':  'Launches',
    'workshops': 'Workshops',
    'training':  'Training'
  },
  news: {
    'new projects':     'New Projects',
    'new companies':    'New Companies',
    'hiring':           'Hiring',
    'expansions':       'Expansions',
    'SAFEs':            'SAFEs',
    'other investment': 'Other Investment'
  },
  spaces: {
    'events':       'Events',
    'office space': 'Office Space',
    'industrial':   'Industrial',
    'retail':       'Retail',
    'yard':         'Yard',
    'warehouse':    'Warehouse'
  },
  tools: {
    'electronics':   'Electronics',
    'fabrication':   'Fabrication',
    'manufacturing': 'Manufacturing',
    'warehouse':     'Warehouse',
    'other':         'Other'
  },
  experts: {
    'software':      'Software',
    'electronics':   'Electronics',
    'fabrication':   'Fabrication',
    'manufacturing': 'Manufacturing',
    'logistics':     'Logistics',
    'management':    'Management',
    'other':         'Other'
  },
  shows: {
    'shops': 'Shops',
    'factories': 'Factories',
    'makerspaces': 'Makerspaces',
    'studios': 'Studios',
    'labs': 'Labs'
  }
};

/* Location is FREE TEXT in the live form, so there is no controlled list
   to validate against. The filter's options are derived from whatever the
   board actually contains — see locationsIn(). `where` is a different
   field and stays free text too: `location` is the region you filter by
   ("Hamilton"), `where` is the address you drive to ("88 Barton St E").

   The cost of free text is that "Hamilton", "hamilton" and "Hamilton, ON"
   become three filter values. normaliseLocation collapses the first two;
   the third is a judgement only a person can make. */
export function normaliseLocation(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function locationsIn(records) {
  const seen = new Map();
  for (const r of records ?? []) {
    const raw = normaliseLocation(r.location);
    /* First spelling wins. Map.set would let the last one win, so a later
       "hamilton" would rewrite an earlier "Hamilton" in the dropdown.
       Matching is case-insensitive either way — this only picks which
       spelling a reader sees. */
    const key = raw.toLowerCase();
    if (raw && !seen.has(key)) seen.set(key, raw);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/* A board that can only say "I have" is half a board. Offering/Seeking
   makes it bidirectional at the cost of one field, and composes with the
   existing filters for free. News is excluded: news is neither offered
   nor sought. */
export const OFFERS = { offering: 'Offering', seeking: 'Seeking' };

/* Only categories where a listing is a two-sided proposition. An event
   happens and news happened — neither is offered or sought, so the field
   and its filter are hidden for both rather than sitting there inert. */
export const OFFER_CATEGORIES = ['spaces', 'tools', 'experts'];
export const hasOffer = (category) => OFFER_CATEGORIES.includes(category);

/* Required fields by CATEGORY, not by kind — differences are kept to the
   minimum that still makes each category readable. Every category also
   requires category, kind, location, name and email; name and email are
   never published. */
export const REQUIRED = {
  events:  ['title', 'when', 'where', 'contact'],
  news:    ['title', 'link', 'description'],
  spaces:  ['where', 'description', 'contact'],
  tools:   ['title', 'where', 'description', 'contact'],
  experts: ['title', 'description', 'contact'],
  shows:   ['title', 'presenter', 'specs', 'description', 'link']
};

/* `price` is free text on purpose. "$400/mo", "free to members",
   "negotiable" and "trade for shop time" are all real answers; a number
   field forces false precision and then cannot hold the honest one.

   `specs` is separate from `description` because the two get read
   differently: "Heller 1707 MK5, 7 zones" is scanned, "bookable evenings,
   bring your own stencils" is read. */
export const OPTIONAL = {
  events:  ['presenter', 'description', 'price', 'link'],
  news:    ['where', 'price', 'contact'],
  spaces:  ['offer', 'title', 'when', 'specs', 'price', 'link'],
  tools:   ['offer', 'presenter', 'specs', 'price', 'link'],
  experts: ['offer', 'when', 'where', 'price', 'link'],
  shows:   []
};

export function isKind(category, kind) {
  return Object.prototype.hasOwnProperty.call(KINDS[category] ?? {}, String(kind));
}

export function kindLabel(category, kind) {
  return KINDS[category]?.[kind] ?? String(kind ?? '');
}
