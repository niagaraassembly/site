import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TEXT, BOARD_TYPES, LEVELS, GH_USER,
  buildFormBody, validateJoin, validateBoard, validateRegister
} from '../assets/js/submit.js';

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

test('an unknown board type is rejected before any field is checked', () => {
  assert.deepEqual(validateBoard({ type: 'rumour' }), ['type']);
  assert.deepEqual(validateBoard({}), ['type']);
});

test('board types are exactly the six in the spec', () => {
  assert.deepEqual(BOARD_TYPES, ['standup', 'talk', 'demo', 'space', 'news', 'idea']);
});

test('news needs no when, but standup does', () => {
  const news = { type: 'news', name: 'Rosa', email: 'r@example.ca',
                 title: 'Plant reopens', link: 'https://example.ca/x', description: 'Details.' };
  assert.deepEqual(validateBoard(news), []);

  const standup = { type: 'standup', name: 'Rosa', email: 'r@example.ca',
                    title: 'Open bench night', where: 'Welland', contact: 'rosa@example.ca' };
  assert.deepEqual(validateBoard(standup), ['when']);
});

test('every board type requires a name and an email', () => {
  for (const type of BOARD_TYPES) {
    const errors = validateBoard({ type });
    assert.ok(errors.includes('name'), `${type} should require name`);
    assert.ok(errors.includes('email'), `${type} should require email`);
  }
});

test('talk and demo require a presenter; standup does not', () => {
  const base = { name: 'Rosa', email: 'r@example.ca', title: 'T',
                 when: 'Thursday', where: 'Welland', contact: 'c@example.ca' };
  assert.deepEqual(validateBoard({ ...base, type: 'talk' }), ['presenter']);
  assert.deepEqual(validateBoard({ ...base, type: 'demo' }), ['presenter']);
  assert.deepEqual(validateBoard({ ...base, type: 'standup' }), []);
});

test('space needs a location, a description and a contact but no title', () => {
  const space = { type: 'space', name: 'Rosa', email: 'r@example.ca',
                  where: '12 Ross St', description: '900 sq ft, month to month.',
                  contact: 'rosa@example.ca' };
  assert.deepEqual(validateBoard(space), []);
});

test('idea needs only a title and a description', () => {
  const idea = { type: 'idea', name: 'Rosa', email: 'r@example.ca',
                 title: 'Shared CMM', description: 'One machine, six shops.' };
  assert.deepEqual(validateBoard(idea), []);
});

test('a non-http link is rejected wherever it appears', () => {
  const idea = { type: 'idea', name: 'Rosa', email: 'r@example.ca',
                 title: 'T', description: 'D', link: 'javascript:alert(1)' };
  assert.deepEqual(validateBoard(idea), ['link-not-http']);
});

test('an over-long description is rejected', () => {
  const idea = { type: 'idea', name: 'Rosa', email: 'r@example.ca',
                 title: 'T', description: 'x'.repeat(MAX_TEXT + 1) };
  assert.ok(validateBoard(idea).includes('description-too-long'));
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
