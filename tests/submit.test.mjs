import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFormBody, validateEndorsement, validateMeetup, MAX_COMMENT } from '../assets/js/submit.js';

const MAP = { name: 'entry.1', email: 'entry.2', comment: 'entry.3' };

test('maps named fields onto Google Form entry ids', () => {
  const b = buildFormBody({ name: 'Rosa', email: 'r@x.ca', comment: 'hi' }, MAP);
  assert.equal(b.get('entry.1'), 'Rosa');
  assert.equal(b.get('entry.3'), 'hi');
});

test('omits empty and missing fields rather than sending blanks', () => {
  const b = buildFormBody({ name: 'Rosa', comment: '' }, MAP);
  assert.equal(b.get('entry.1'), 'Rosa');
  assert.equal(b.has('entry.2'), false);
  assert.equal(b.has('entry.3'), false);
});

test('omits whitespace-only values rather than sending blanks', () => {
  const b = buildFormBody({ name: 'Rosa', comment: '   ' }, MAP);
  assert.equal(b.has('entry.3'), false);
});

test('endorsement requires name, email, location and trade', () => {
  assert.deepEqual(validateEndorsement({}).sort(), ['email', 'location', 'name', 'trade']);
  assert.deepEqual(validateEndorsement({ name:'a', email:'b', location:'c', trade:'d' }), []);
});

test('a comment over the cap is rejected', () => {
  const v = { name:'a', email:'b', location:'c', trade:'d', comment:'x'.repeat(MAX_COMMENT + 1) };
  assert.deepEqual(validateEndorsement(v), ['comment-too-long']);
  assert.equal(MAX_COMMENT, 2500);
});

test('meetup requires title, start and venue; the calendar link is optional', () => {
  assert.deepEqual(validateMeetup({}).sort(), ['starts', 'title', 'venue']);
  assert.deepEqual(validateMeetup({ title:'a', starts:'2026-09-04T19:00', venue:'c' }), []);
});
