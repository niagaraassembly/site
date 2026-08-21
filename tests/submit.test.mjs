import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TEXT, LEVELS, GH_USER, VISIBILITY,
  buildFormBody, validateJoin, validateBoard, validateRegister
} from '../assets/js/submit.js';
import { CATEGORIES, KINDS, REQUIRED, OPTIONAL, isKind, locationsIn, normaliseLocation, hasOffer } from '../assets/js/nav.js';

/* A valid post in each category, so a test can name the one field it is
   about instead of restating six. */
const post = (category, o = {}) => ({
  category,
  kind: Object.keys(KINDS[category])[0],
  location: 'Niagara',
  name: 'Rosa', email: 'r@example.ca',
  ...({
    events:  { title: 'Open bench night', when: 'Thursday 7pm',
               where: '12 Ross St', contact: 'rosa@example.ca' },
    news:    { title: 'Plant reopens', link: 'https://example.ca/x',
               description: 'Two hundred jobs.' },
    spaces:  { where: '12 Ross St', description: '900 sq ft, month to month.',
               contact: 'rosa@example.ca' },
    tools:   { title: 'Reflow oven', where: '12 Ross St',
               description: 'Bookable evenings.', contact: 'rosa@example.ca' },
    experts: { title: 'Rosa Silva', description: 'IPC-A-610 trainer, 12 years.',
               contact: 'rosa@example.ca', visibility: 'public' }
  })[category],
  ...o
});

const join = (o = {}) => ({ name: 'Rosa', email: 'r@example.ca', level: 'List', ...o });

test('buildFormBody maps fields to entry ids and drops blanks', () => {
  const body = buildFormBody({ name: 'Rosa', email: '  ' }, { name: 'entry.1', email: 'entry.2' });
  assert.equal(body.get('entry.1'), 'Rosa');
  assert.equal(body.get('entry.2'), null);
});

test('join needs a name, an email and a known level', () => {
  assert.deepEqual(validateJoin(join()), []);
  assert.deepEqual(validateJoin(join({ name: '' })), ['name']);
  assert.deepEqual(validateJoin(join({ level: 'Platinum' })), ['level']);
});

test('every offered level validates', () => {
  assert.deepEqual(LEVELS, ['List', 'Regional', 'Company', 'Champion']);
  for (const level of LEVELS) assert.deepEqual(validateJoin(join({ level })), []);
});

test('an unknown category is rejected before any field is checked', () => {
  assert.deepEqual(validateBoard({ category: 'rumour' }), ['category']);
  assert.deepEqual(validateBoard({}), ['category']);
});

test('a kind from the wrong category is rejected', () => {
  // "software" is an Experts kind, not an Events one.
  assert.deepEqual(validateBoard({ category: 'events', kind: 'software' }), ['kind']);
  assert.deepEqual(validateBoard({ category: 'events', kind: 'stand-ups', name: '' }).length > 0, true);
});

test('warehouse is a valid kind under both spaces and tools', () => {
  assert.ok(isKind('spaces', 'warehouse'));
  assert.ok(isKind('tools', 'warehouse'));
  assert.ok(!isKind('news', 'warehouse'));
});

test('the five categories match the nav', () => {
  assert.deepEqual(CATEGORIES, ['events', 'news', 'spaces', 'tools', 'experts']);
});

test('the kind keys are the live form option values', () => {
  assert.deepEqual(Object.keys(KINDS.events),
    ['stand-ups', 'talks', 'demos', 'launches', 'workshops', 'training']);
  assert.deepEqual(Object.keys(KINDS.news),
    ['new projects', 'new companies', 'hiring', 'expansions', 'SAFEs', 'other investment']);
  assert.deepEqual(Object.keys(KINDS.spaces),
    ['events', 'office space', 'industrial', 'retail', 'yard', 'warehouse']);
});

test('the form Kind list is one de-duplicated union of every category', () => {
  const union = new Set();
  for (const c of CATEGORIES) for (const k of Object.keys(KINDS[c])) union.add(k);
  assert.equal(union.size, 25, 'the live form offers 25 Kind options');
});

test('every subnav from the screenshot is present, in order', () => {
  assert.deepEqual(Object.values(KINDS.events),
    ['Standups', 'Talks', 'Demos', 'Launches', 'Workshops', 'Training']);
  assert.deepEqual(Object.values(KINDS.news),
    ['New Projects', 'New Companies', 'Hiring', 'Expansions', 'SAFEs', 'Other Investment']);
  assert.deepEqual(Object.values(KINDS.spaces),
    ['Events', 'Office Space', 'Industrial', 'Retail', 'Yard', 'Warehouse']);
  assert.deepEqual(Object.values(KINDS.tools),
    ['Electronics', 'Fabrication', 'Manufacturing', 'Warehouse', 'Other']);
  assert.deepEqual(Object.values(KINDS.experts),
    ['Software', 'Electronics', 'Fabrication', 'Manufacturing', 'Logistics', 'Management', 'Other']);
});

test('a valid post in every category passes', () => {
  for (const category of CATEGORIES) {
    assert.deepEqual(validateBoard(post(category)), [], `${category} should validate`);
  }
});

test('every category requires a name, an email and a location', () => {
  for (const category of CATEGORIES) {
    for (const field of ['name', 'email', 'location']) {
      assert.ok(validateBoard(post(category, { [field]: '' })).includes(field),
                `${category} should require ${field}`);
    }
  }
});

test('location is required but free text — any non-empty value passes', () => {
  for (const value of ['Hamilton', 'st. catharines', 'Buffalo, NY', 'Port Dover']) {
    assert.deepEqual(validateBoard(post('events', { location: value })), []);
  }
  assert.ok(validateBoard(post('events', { location: '   ' })).includes('location'));
});

test('locationsIn derives filter options from the data, case-folded', () => {
  const records = [{ location: 'Hamilton' }, { location: 'hamilton' },
                   { location: ' Niagara ' }, { location: '' }];
  assert.deepEqual(locationsIn(records), ['Hamilton', 'Niagara']);
});

test('normaliseLocation trims and collapses whitespace', () => {
  assert.equal(normaliseLocation('  Port   Dover '), 'Port Dover');
});

test('news needs no when, but events do', () => {
  assert.deepEqual(validateBoard(post('news')), []);
  assert.deepEqual(validateBoard(post('events', { when: '' })), ['when']);
});

test('spaces need no title, but tools do', () => {
  assert.deepEqual(validateBoard(post('spaces', { title: '' })), []);
  assert.deepEqual(validateBoard(post('tools', { title: '' })), ['title']);
});

test('only experts carry a visibility choice, and it is required there', () => {
  assert.deepEqual(VISIBILITY, ['public', 'private', 'both']);
  assert.deepEqual(validateBoard(post('experts', { visibility: '' })), ['visibility']);
  assert.deepEqual(validateBoard(post('experts', { visibility: 'maybe' })), ['visibility']);
  for (const v of VISIBILITY) {
    assert.deepEqual(validateBoard(post('experts', { visibility: v })), []);
  }
  // Absent on every other category, and harmless there.
  assert.deepEqual(validateBoard(post('events', { visibility: '' })), []);
});

test('offer belongs only to categories that are two-sided', () => {
  assert.deepEqual(CATEGORIES.filter(hasOffer), ['spaces', 'tools', 'experts']);
  for (const c of CATEGORIES) {
    assert.equal(OPTIONAL[c].includes('offer'), hasOffer(c), `${c} offer field`);
  }
});

test('offer is optional but must be a known value when given', () => {
  assert.deepEqual(validateBoard(post('tools', { offer: 'offering' })), []);
  assert.deepEqual(validateBoard(post('tools', { offer: 'seeking' })), []);
  assert.deepEqual(validateBoard(post('tools', { offer: '' })), []);
  assert.deepEqual(validateBoard(post('tools', { offer: 'bartering' })), ['offer']);
});

test('news carries a contact — a hiring post needs somewhere to apply', () => {
  assert.deepEqual(validateBoard(post('news', { contact: 'jobs@example.ca' })), []);
});

test('specs and price are accepted where the category allows them', () => {
  assert.deepEqual(
    validateBoard(post('tools', { specs: 'Heller 1707 MK5', price: 'free to borrow' })), []);
  assert.deepEqual(
    validateBoard(post('spaces', { specs: '4,000 sq ft', price: '$1,200/mo' })), []);
});

test('a non-http link is rejected wherever it appears', () => {
  assert.deepEqual(validateBoard(post('events', { link: 'javascript:alert(1)' })),
                   ['link-not-http']);
});

test('an over-long description is rejected', () => {
  assert.ok(validateBoard(post('events', { description: 'x'.repeat(MAX_TEXT + 1) }))
            .includes('description-too-long'));
});

test('expert registration needs expertise and region', () => {
  const expert = { kind: 'expert', name: 'Rosa', email: 'r@example.ca',
                   expertise: 'IPC-A-610', region: 'Niagara' };
  assert.deepEqual(validateRegister(expert), []);
  assert.deepEqual(validateRegister({ ...expert, region: '' }), ['region']);
});

test('open-source registration validates the GitHub username', () => {
  const oss = { kind: 'opensource', name: 'Rosa', email: 'r@example.ca',
                github_username: 'rosa-silva' };
  assert.deepEqual(validateRegister(oss), []);
  assert.deepEqual(validateRegister({ ...oss, github_username: 'rosa silva' }),
                   ['github-username']);
  assert.deepEqual(validateRegister({ ...oss, github_username: '-rosa' }),
                   ['github-username']);
});

test('an unknown registration kind is rejected', () => {
  assert.deepEqual(validateRegister({ kind: 'sponsor' }), ['kind']);
});

test('the username pattern matches GitHub\'s own rules', () => {
  assert.ok(GH_USER.test('a'));
  assert.ok(GH_USER.test('a-b-c'));
  assert.ok(!GH_USER.test('a--b'));
  assert.ok(!GH_USER.test('a-'));
  assert.ok(!GH_USER.test('x'.repeat(40)));
});
