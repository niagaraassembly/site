/**
 * Bound to the Board form's response Sheet. Paste alongside _shared.gs.
 *
 * One form serves five categories. The Google Form has NO required
 * questions — a News post has no When, and a required question would
 * reject it — so the browser validates in assets/js/submit.js and
 * scripts/approve_request.py validates again before anything is
 * committed. This script is transport between the two and deliberately
 * adds no third opinion about which fields a category needs.
 *
 * What it IS responsible for, and what nothing else can do for it:
 *
 *   1. Keeping name and email out of the data block. That block is the
 *      input to a public commit in a public repo with permanent history.
 *   2. Routing on the Experts visibility choice, via LABELS. The Action
 *      fires on `approved` only when the issue also carries `board`, so
 *      an expert who asked not to be published simply never gets that
 *      label and cannot be published by approving them.
 *
 * Form question titles: Type, Kind, Location, Offer, Name, Email, Title,
 * Presenter, When, Where, Specs, Price, Description, Link, Contact,
 * Visibility
 */

var KIT_TAG_BOARD = 'na-board';
var KIT_TAG_EXPERT = 'na-expert';

var CATEGORIES = ['events', 'news', 'spaces', 'tools', 'experts'];

/* Public fields only. name and email are captured for follow-up and Kit
   and appear nowhere below. */
function buildBoardBody(r) {
  var data = {
    category: r.category,
    kind: r.kind,
    location: r.location,
    offer: r.offer,
    title: r.title,
    presenter: r.presenter,
    when: r.when,
    where: r.where,
    specs: r.specs,
    price: r.price,
    description: (r.description || '').slice(0, MAX_TEXT),
    link: r.link,
    contact: r.contact
  };

  /* Drop empties so the block stays readable for whoever reviews it —
     approve_request.py ignores absent keys anyway. */
  for (var k in data) if (!data[k]) delete data[k];

  /* Only Experts carry a visibility choice, and approve_request.py
     REQUIRES it there: a record without one fails validation rather than
     defaulting to published. Added after the empty-drop so it survives. */
  if (r.category === 'experts') data.visibility = r.visibility;

  return 'A ' + r.category + ' listing was posted by ' + r.name + '.\n\n' +
         '**`approved`** — add this label to publish it to the board.\n' +
         'Nothing else publishes it, and nothing publishes automatically.\n\n' +
         'Submitter (not published): ' + r.name + ' <' + r.email + '>\n\n' +
         '<!--DATA\n' + JSON.stringify(data, null, 1) + '\nDATA-->';
}

/* The visibility choice becomes labels, because labels are what the
   Action reads. `board` is the publish gate; `expert` marks an entry a
   person needs to follow up on. */
function labelsFor(r) {
  if (r.category !== 'experts') return ['board'];
  if (r.visibility === 'private') return ['expert'];
  if (r.visibility === 'both') return ['board', 'expert'];
  return ['board'];
}

function onFormSubmit(e) {
  var pick = pickFrom_(e.namedValues);
  var r = {
    category: pick('Type'), kind: pick('Kind'), location: pick('Location'),
    offer: pick('Offer'),
    name: pick('Name'), email: pick('Email'),
    title: pick('Title'), presenter: pick('Presenter'), when: pick('When'),
    where: pick('Where'), specs: pick('Specs'), price: pick('Price'),
    description: pick('Description'),
    link: pick('Link'), contact: pick('Contact'),
    visibility: pick('Visibility')
  };

  if (CATEGORIES.indexOf(r.category) === -1) {
    Logger.log('board: unknown category "%s" — filing anyway for triage', r.category);
  }

  var headline = r.title || r.where || '(untitled)';
  createIssue_(r.category + ': ' + headline, buildBoardBody(r), labelsFor(r));
  tagQuietly_(r.email, r.name,
              r.category === 'experts' ? KIT_TAG_EXPERT : KIT_TAG_BOARD);
}

function runSelfTest() {
  var props = assertProperties_();

  var news = buildBoardBody({
    category: 'news', kind: 'hiring', location: 'Buffalo',
    name: 'Rosa Silva', email: 'rosa@example.ca',
    title: 'Trico hiring forty', link: 'https://example.ca/trico',
    description: 'Forty roles across two shifts.'
  });

  var m = news.match(/<!--DATA\s*([\s\S]*?)\s*DATA-->/);
  if (!m) throw new Error('FAIL: no data block');
  var parsed = JSON.parse(m[1]);

  if (parsed.category !== 'news') throw new Error('FAIL: category not carried');
  if (parsed.kind !== 'hiring') throw new Error('FAIL: kind not carried');
  if (parsed.location !== 'Buffalo') throw new Error('FAIL: location not carried');
  if ('email' in parsed) throw new Error('FAIL: email must never enter the data block');
  if ('name' in parsed) throw new Error('FAIL: name must never enter the data block');
  if ('when' in parsed) throw new Error('FAIL: empty fields must be dropped, not sent blank');
  if ('visibility' in parsed) throw new Error('FAIL: only Experts carry a visibility');

  /* Every field buildBoardBody reads must be one onFormSubmit picks. A
     field added to the block but not to the pick list is invisible: it
     arrives undefined, the empty-drop removes it, and the listing simply
     loses that value with nothing logged. */
  var picked = onFormSubmit.toString();
  var readByBody = ['category', 'kind', 'location', 'offer', 'title', 'presenter',
                    'when', 'where', 'specs', 'price', 'description', 'link', 'contact'];
  var TITLES = { category: 'Type', kind: 'Kind', location: 'Location', offer: 'Offer',
                 title: 'Title', presenter: 'Presenter', when: 'When', where: 'Where',
                 specs: 'Specs', price: 'Price', description: 'Description',
                 link: 'Link', contact: 'Contact' };
  for (var i = 0; i < readByBody.length; i++) {
    if (picked.indexOf("pick('" + TITLES[readByBody[i]] + "')") === -1) {
      throw new Error('FAIL: onFormSubmit never picks "' + TITLES[readByBody[i]] +
                      '" — that field would silently arrive empty on every post');
    }
  }

  var full = JSON.parse(buildBoardBody({
    category: 'tools', kind: 'electronics', location: 'Niagara', offer: 'seeking',
    name: 'Rosa Silva', email: 'rosa@example.ca', title: 'Reflow oven',
    where: '12 Ross St', specs: 'Heller 1707 MK5', price: 'free to borrow',
    description: 'Bookable evenings.', contact: 'rosa@example.ca'
  }).match(/<!--DATA\s*([\s\S]*?)\s*DATA-->/)[1]);
  if (full.offer !== 'seeking') throw new Error('FAIL: offer not carried');
  if (full.specs !== 'Heller 1707 MK5') throw new Error('FAIL: specs not carried');
  if (full.price !== 'free to borrow') throw new Error('FAIL: price not carried');

  var expert = { category: 'experts', kind: 'software', location: 'Niagara',
                 name: 'Rosa Silva', email: 'rosa@example.ca',
                 title: 'Rosa Silva', description: 'IPC-A-610 trainer.',
                 contact: 'rosa@example.ca', visibility: 'private' };
  var parsedExpert = JSON.parse(
    buildBoardBody(expert).match(/<!--DATA\s*([\s\S]*?)\s*DATA-->/)[1]);
  if (parsedExpert.visibility !== 'private') {
    throw new Error('FAIL: Experts must carry their visibility choice');
  }

  /* The routing is the whole point of the visibility question. If a
     private expert ever gets the `board` label, approving them publishes
     the thing they asked us not to publish. */
  if (labelsFor(expert).join(',') !== 'expert') {
    throw new Error('FAIL: a private expert must not get the `board` label');
  }
  expert.visibility = 'public';
  if (labelsFor(expert).join(',') !== 'board') throw new Error('FAIL: public routing');
  expert.visibility = 'both';
  if (labelsFor(expert).join(',') !== 'board,expert') throw new Error('FAIL: both routing');
  if (labelsFor({ category: 'events' }).join(',') !== 'board') {
    throw new Error('FAIL: non-expert routing');
  }

  var kitApiKey = props.getProperty('KIT_API_KEY');
  if (!findKitTag_(KIT_TAG_BOARD, kitApiKey)) {
    throw new Error('FAIL: Kit tag "' + KIT_TAG_BOARD + '" does not exist');
  }
  if (!findKitTag_(KIT_TAG_EXPERT, kitApiKey)) {
    throw new Error('FAIL: Kit tag "' + KIT_TAG_EXPERT + '" does not exist');
  }

  Logger.log('RESULT: all checks passed');
}
