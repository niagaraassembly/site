import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMeetupLine, meetupDrawerRow, upcoming, bandState } from '../assets/js/meetups.js';

const A = { id:'m-1', title:'Open bench night', starts:'2026-09-04T19:00:00-04:00', venue:'Welland Fabrication, 12 Ross St' };
const B = { id:'m-2', title:'Talk', starts:'2026-09-11T18:30:00-04:00', venue:'Hamilton' };
const OLD = { id:'m-0', title:'Past', starts:'2026-07-01T19:00:00-04:00', venue:'Buffalo' };
const NOW = new Date('2026-08-19T12:00:00-04:00');

test('formats a line from the string components, on the hour', () => {
  assert.equal(formatMeetupLine(A), 'Fri Sep 4, 7pm — Welland Fabrication, 12 Ross St');
});

test('keeps the minutes when they are not zero', () => {
  assert.equal(formatMeetupLine(B), 'Fri Sep 11, 6:30pm — Hamilton');
});

test('upcoming drops past meetups and sorts ascending', () => {
  assert.deepEqual(upcoming([B, OLD, A], NOW).map(m => m.id), ['m-1', 'm-2']);
});

test('band state carries the next meetup', () => {
  const s = bandState([B, A], NOW);
  assert.equal(s.empty, false);
  assert.equal(s.listingEnabled, true);
  assert.equal(s.meetup.id, 'm-1');
});

test('band state with nothing upcoming is an invitation, not an error', () => {
  const s = bandState([OLD], NOW);
  assert.equal(s.empty, true);
  assert.equal(s.listingEnabled, false);
  assert.equal(s.text, 'No meetups yet — post the first one');
});

test('drawer row publishes organizer contact with escaping', () => {
  const html = meetupDrawerRow({ ...A, contact:'organize@example.org <script>' });
  assert.match(html, /Contact: organize@example\.org &lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
