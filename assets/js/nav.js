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

export const CATEGORIES = ['events', 'news', 'spaces', 'tools', 'experts'];

export const CATEGORY_LABELS = {
  events:  'Events',
  news:    'News',
  spaces:  'Spaces',
  tools:   'Tools',
  experts: 'Experts'
};

/* Slug -> visible label, in the screenshot's order. "All" is prepended by
   the page, not stored here — it is a view, never a value a record holds. */
export const KINDS = {
  events: {
    standup:  'Standups',
    talk:     'Talks',
    demo:     'Demos',
    launch:   'Launches',
    workshop: 'Workshops',
    training: 'Training'
  },
  news: {
    'new-project':      'New Projects',
    'new-company':      'New Companies',
    hiring:             'Hiring',
    expansion:          'Expansions',
    safe:               'SAFEs',
    'other-investment': 'Other Investment'
  },
  spaces: {
    'event-space': 'Events',
    office:        'Office Space',
    industrial:    'Industrial',
    retail:        'Retail',
    yard:          'Yard',
    warehouse:     'Warehouse'
  },
  tools: {
    electronics:   'Electronics',
    fabrication:   'Fabrication',
    manufacturing: 'Manufacturing',
    warehouse:     'Warehouse',
    other:         'Other'
  },
  experts: {
    software:      'Software',
    electronics:   'Electronics',
    fabrication:   'Fabrication',
    manufacturing: 'Manufacturing',
    logistics:     'Logistics',
    management:    'Management',
    other:         'Other'
  }
};

/* The region filter runs off this, not off free-text `where`. A venue
   string like "Welland Fabrication, 12 Ross St" is unfilterable; a
   controlled list is. Both fields exist: `location` filters, `where`
   tells a human where to actually go. */
export const LOCATIONS = {
  hamilton:  'Hamilton',
  niagara:   'Niagara',
  buffalo:   'Buffalo',
  rochester: 'Rochester',
  other:     'Elsewhere in the region'
};

/* A board that can only say "I have" is half a board. Offering/Seeking
   makes it bidirectional at the cost of one field, and composes with the
   existing filters for free. News is excluded: news is neither offered
   nor sought. */
export const OFFERS = { offering: 'Offering', seeking: 'Seeking' };

/* Required fields by CATEGORY, not by kind — differences are kept to the
   minimum that still makes each category readable. Every category also
   requires category, kind, location, name and email; name and email are
   never published. */
export const REQUIRED = {
  events:  ['title', 'when', 'where', 'contact'],
  news:    ['title', 'link', 'description'],
  spaces:  ['where', 'description', 'contact'],
  tools:   ['title', 'where', 'description', 'contact'],
  experts: ['title', 'description', 'contact']
};

/* `price` is free text on purpose. "$400/mo", "free to members",
   "negotiable" and "trade for shop time" are all real answers; a number
   field forces false precision and then cannot hold the honest one.

   `specs` is separate from `description` because the two get read
   differently: "Heller 1707 MK5, 7 zones" is scanned, "bookable evenings,
   bring your own stencils" is read. */
export const OPTIONAL = {
  events:  ['offer', 'presenter', 'description', 'price', 'link'],
  news:    ['where', 'price', 'contact'],
  spaces:  ['offer', 'title', 'when', 'specs', 'price', 'link'],
  tools:   ['offer', 'presenter', 'specs', 'price', 'link'],
  experts: ['offer', 'when', 'where', 'price', 'link']
};

export function isKind(category, kind) {
  return Object.prototype.hasOwnProperty.call(KINDS[category] ?? {}, String(kind));
}

export function kindLabel(category, kind) {
  return KINDS[category]?.[kind] ?? String(kind ?? '');
}
