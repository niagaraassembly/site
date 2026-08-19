# Niagara Assembly Manifesto Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `niagaraassembly.com` — a one-page manifesto with a public endorsement roster and an organizer-posted meetup listing, both fed by approval-gated pipelines.

**Architecture:** A single static page with two faces (the statement / the endorsements) switched by URL hash, plus a ruled meetup band present on both. All rendering reads committed JSON. All writes go public form → Google Form → Sheet → Apps Script → GitHub Issue → `approved` label → GitHub Action → committed JSON. Nothing in the browser talks to a database. All display logic is split into pure functions (tested with `node --test`) and thin DOM wiring (untested by design).

**Tech Stack:** Plain HTML/CSS/ES modules, no framework, no build step. Node 18+ built-in test runner for JS. Python 3.9+ stdlib and `unittest` for the write script. Google Apps Script for form processing. GitHub Pages + Actions.

**Spec:** `docs/superpowers/specs/2026-08-19-niagaraassembly-manifesto-site-design.md`

## Global Constraints

Every task's requirements implicitly include these. Values are copied verbatim from the spec.

- **Title, exactly:** `One neighbo(u)r to another` — sentence case, `(u)` load-bearing. Never "One Neighbour to Another", never "One Neighbor to Another", never title case.
- **No tariff rate, dollar figure or deadline appears anywhere in the statement.** Structural point only.
- **No mention of, or link to, Clark or Paton Hall.** Not in copy, not in comments, not in commit messages.
- **Email is never written to `data/endorsements.json`.** The repo is public.
- **Comment cap: 2,500 characters.** Enforced client-side and again in `approve_request.py`.
- **Publishing notice, exact copy:** `Comments are posted as written — we don't edit them. Please avoid defamatory or foul language.`
- **Cited reuse examples are evidence, never partners.** No copy may imply agreement or affiliation.
- **No Open Color palette, no Rough.js, no hand-drawn borders** — those are another project's identity.
- **No dependencies.** No npm install, no pip install. Node built-ins and Python stdlib only.
- **Every value rendered from `data/*.json` is untrusted and must be escaped at the point of interpolation**, using `escapeHtml` from `assets/js/escape.js`. URLs additionally pass through `safeHttpUrl`, which returns null for anything that is not `http(s)` — a `javascript:` href reaching the page is a Critical defect. The `approved` label is an *editorial* gate that catches defamation and spam; it is not a security control, and the content behind it arrives from a public form.
- Copy must not specify the gender of a room.

---

## File Structure

| Path | Responsibility |
|---|---|
| `index.html` | The whole site: header, face toggle, band, statement, flip side, two forms |
| `assets/css/site.css` | All styling; design tokens at the top |
| `assets/js/faces.js` | Pure: hash → face id. Plus toggle wiring |
| `assets/js/meetups.js` | Pure: next meetup, band state, line formatting. Plus band + drawer render |
| `assets/js/endorsements.js` | Pure: voices filter, comment collapse, column split. Plus flip-side render |
| `assets/js/submit.js` | Pure: form body building, validation. Plus shared submit handler |
| `data/endorsements.json` | Public roster. Written by the Action |
| `data/meetups.json` | Public meetup list. Written by the Action |
| `scripts/approve_request.py` | Parse issue data block, validate, append to JSON |
| `tests/*.test.mjs` | Node tests for the pure JS |
| `tests/test_approve_request.py` | unittest for the write script |
| `google-apps-script/endorse.gs` | Sheet → Kit → Issue |
| `google-apps-script/meetup.gs` | Sheet → Issue |
| `.github/workflows/approve-request.yml` | `approved` label → run script → commit |
| `CNAME`, `.nojekyll` | Pages config |

---

### Task 1: Page shell, face switching, design tokens

**Files:**
- Create: `index.html`, `assets/css/site.css`, `assets/js/faces.js`
- Test: `tests/faces.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `resolveFace(hash) -> 'statement' | 'endorsements'`, `FACES` array. `index.html` exposes `#face-statement` and `#face-endorsements` sections and `[data-face-btn]` buttons.

Faces switch on the URL hash so a reader can forward a link straight to the endorsements. That makes the core logic a pure string function.

- [ ] **Step 1: Write the failing test**

```js
// tests/faces.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFace, FACES } from '../assets/js/faces.js';

test('defaults to the statement', () => {
  assert.equal(resolveFace(''), 'statement');
  assert.equal(resolveFace(undefined), 'statement');
  assert.equal(resolveFace('#nonsense'), 'statement');
});

test('resolves a known face, with or without the hash mark', () => {
  assert.equal(resolveFace('#endorsements'), 'endorsements');
  assert.equal(resolveFace('endorsements'), 'endorsements');
  assert.equal(resolveFace('#statement'), 'statement');
});

test('exposes both faces in order', () => {
  assert.deepEqual(FACES, ['statement', 'endorsements']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/faces.test.mjs`
Expected: FAIL — cannot find module `../assets/js/faces.js`

- [ ] **Step 3: Write minimal implementation**

```js
// assets/js/faces.js
export const FACES = ['statement', 'endorsements'];

export function resolveFace(hash) {
  const id = String(hash ?? '').replace(/^#/, '');
  return FACES.includes(id) ? id : FACES[0];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/faces.test.mjs`
Expected: PASS, 3 tests

- [ ] **Step 5: Add the DOM wiring**

Append to `assets/js/faces.js`:

```js
export function mountFaces(doc = document) {
  const show = (face) => {
    for (const id of FACES) {
      doc.getElementById(`face-${id}`).hidden = id !== face;
      doc.querySelector(`[data-face-btn="${id}"]`)
         .setAttribute('aria-current', String(id === face));
    }
  };
  show(resolveFace(location.hash));
  addEventListener('hashchange', () => show(resolveFace(location.hash)));
}
```

- [ ] **Step 6: Write `index.html`**

The statement body is written in Task 2 — leave `<!-- STATEMENT -->` as the only marker.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>One neighbo(u)r to another — Niagara Assembly</title>
<meta name="description" content="A statement on industrial renewal across the Niagara region, from Hamilton to Rochester.">
<link rel="stylesheet" href="assets/css/site.css">
</head>
<body>
<header class="masthead">
  <h1 class="masthead__title">One neighbo(u)r to another</h1>
  <nav class="faces" aria-label="Sections">
    <button type="button" data-face-btn="statement" aria-current="true">The Statement</button>
    <button type="button" data-face-btn="endorsements" aria-current="false">Endorsements</button>
  </nav>
</header>

<div id="band" class="band"><!-- Task 3 --></div>

<main>
  <section id="face-statement"><!-- STATEMENT --></section>
  <section id="face-endorsements" hidden><!-- Task 4 --></section>
</main>

<script type="module">
  import { mountFaces } from './assets/js/faces.js';
  mountFaces();
  for (const b of document.querySelectorAll('[data-face-btn]')) {
    b.addEventListener('click', () => { location.hash = b.dataset.faceBtn; });
  }
</script>
</body>
</html>
```

- [ ] **Step 7: Write `assets/css/site.css`**

Tokens first, editorial register, no hand-drawn anything. Reading column caps at 34rem; the flip side gets full width.

```css
:root {
  --ink: #17181a;
  --ink-soft: #55585d;
  --paper: #f7f6f3;
  --rule: #c9c6bf;
  --measure: 34rem;
  --serif: Georgia, 'Times New Roman', serif;
  --sans: 'Helvetica Neue', Arial, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root { --ink: #e9e7e2; --ink-soft: #a3a099; --paper: #16171a; --rule: #3a3c40; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink);
       font: 1.0625rem/1.6 var(--serif); }
.masthead { padding: 2.5rem 1.25rem 0; text-align: center; }
.masthead__title { font-size: clamp(1.75rem, 5vw, 2.75rem); font-weight: 400;
                   letter-spacing: .01em; margin: 0 0 1.25rem; }
.faces { display: flex; max-width: var(--measure); margin: 0 auto; }
.faces button { flex: 1; background: none; border: 1px solid var(--rule);
                color: var(--ink-soft); font: 600 .6875rem/1 var(--sans);
                letter-spacing: .12em; text-transform: uppercase;
                padding: .6rem .25rem; cursor: pointer; }
.faces button[aria-current="true"] { color: var(--ink); background: color-mix(in srgb, var(--rule) 35%, transparent); }
main { padding: 0 1.25rem 4rem; }
#face-statement { max-width: var(--measure); margin: 0 auto; }
#face-statement p { margin: 0 0 1.15em; }
```

- [ ] **Step 8: Commit**

```bash
git add index.html assets/css/site.css assets/js/faces.js tests/faces.test.mjs
git commit -m "Add page shell with hash-driven face switching"
```

---

### Task 2: The statement

**Files:**
- Modify: `index.html` — replace `<!-- STATEMENT -->`

**Interfaces:**
- Consumes: the shell from Task 1
- Produces: nothing programmatic

Prose, so there is no unit test. The gate is the checklist in Step 2 — run it honestly before committing.

- [ ] **Step 1: Draft the nine movements**

Write 1,200–1,800 words into `#face-statement` as semantic HTML (`<p>`, `<h2>`). Follow spec §5 movement by movement:

1. Dart and Dunbar, 1842 — merchant and machinist, Kingman's skepticism, 229,260 bushels the first year, 85M+ by 1888, past London and Rotterdam from a village of 1,800
2. The industrial commons — it is geographic; you cannot import one; the unit of repair is a region
3. Hamilton's Bayfront 6 of 47, tracking paused; then WNY +4,700 private / −2,000 manufacturing to January 2026
4. Up to 1.9M of 3.8M unfilled by 2033; workforce outranks taxes, currency, regulation, tariffs
5. Metal Craft — thirty kilometres. **No tariff numbers**
6. Hamilton 1839, Buffalo 1842, Rochester 1885 → RIT 1944; then Tri-Main, Silo City, The Foundry, the Cotton Factory
7. Preston 39% → 79.2%, ~£200M; Tapestry $100M+ from 4,500 investors
8. The ask — name, trade, town; come to a meetup
9. What this is and isn't — not incorporated, nothing raised, nothing promised

- [ ] **Step 2: Run the copy checklist**

Reject and rewrite if any line fails:

- [ ] No tariff rate, dollar amount or deadline anywhere
- [ ] No mention of Clark or Paton Hall
- [ ] Reuse examples read as evidence, never as partners
- [ ] No "unleashing potential", "world-class", "innovation ecosystem", or any boosterism
- [ ] No line specifies the gender of a room
- [ ] Title renders exactly `One neighbo(u)r to another`
- [ ] Movement 1 reads as risk, not nostalgia — Kingman's wrongness is the point
- [ ] Every number traceable to a spec §12 source

- [ ] **Step 3: Verify it renders**

Run: `python3 -m http.server 8019`
Open `http://localhost:8019`. Confirm the statement reads in one column, the toggle switches faces, and `#endorsements` in the URL lands on the flip side.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Write the statement"
```

---

### Task 3: The meetup band

**Files:**
- Create: `assets/js/meetups.js`, `data/meetups.json`
- Modify: `index.html`, `assets/css/site.css`
- Test: `tests/meetups.test.mjs`

**Interfaces:**
- Consumes: `#band` from Task 1
- Produces: `formatMeetupLine(m) -> string`, `upcoming(list, now) -> array`, `bandState(list, now) -> {empty, listingEnabled, text, meetup}`, `mountBand(meetups, doc)`

Dates are formatted by reading the ISO string's own components rather than converting through a timezone — the organizer types local time and Apps Script writes it with the region's offset, so the string's components *are* the local time. This keeps the formatter deterministic and dependency-free.

- [ ] **Step 1: Write the failing test**

```js
// tests/meetups.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMeetupLine, upcoming, bandState } from '../assets/js/meetups.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/meetups.test.mjs`
Expected: FAIL — cannot find module `../assets/js/meetups.js`

- [ ] **Step 3: Write minimal implementation**

```js
// assets/js/meetups.js
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const EMPTY_TEXT = 'No meetups yet — post the first one';

export function formatMeetupLine(m) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(m.starts);
  if (!parts) return m.venue;
  const [, y, mo, d, hh, mm] = parts;
  const dow = DAYS[new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay()];
  const ap = +hh < 12 ? 'am' : 'pm';
  const h12 = (+hh % 12) || 12;
  const time = +mm ? `${h12}:${mm}${ap}` : `${h12}${ap}`;
  return `${dow} ${MONTHS[+mo - 1]} ${+d}, ${time} — ${m.venue}`;
}

export function upcoming(meetups, now) {
  return meetups
    .filter(m => new Date(m.starts).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.starts) - new Date(b.starts));
}

export function bandState(meetups, now) {
  const next = upcoming(meetups, now)[0];
  return next
    ? { empty: false, listingEnabled: true, text: formatMeetupLine(next), meetup: next }
    : { empty: true, listingEnabled: false, text: EMPTY_TEXT, meetup: null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/meetups.test.mjs`
Expected: PASS, 5 tests

- [ ] **Step 5: Add the band render and drawer**

Append to `assets/js/meetups.js`:

```js
export function mountBand(meetups, doc = document, now = new Date()) {
  const state = bandState(meetups, now);
  const list = upcoming(meetups, now);
  const band = doc.getElementById('band');
  band.innerHTML = `
    <button type="button" id="band-listing" class="band__btn"${state.listingEnabled ? '' : ' disabled'}
            aria-expanded="false" aria-controls="band-drawer">Meetup</button>
    <span class="band__div"></span>
    <span class="band__ev">${state.text}</span>
    <span class="band__div"></span>
    <button type="button" id="band-add" class="band__btn">＋ Add</button>`;
  const drawer = doc.getElementById('band-drawer');
  drawer.innerHTML = list.map(m => `
    <div class="drawer__row">
      <span>${formatMeetupLine(m)}</span>
      ${m.calendar_url ? `<a href="${m.calendar_url}" rel="noopener" target="_blank">cal ↗</a>` : ''}
    </div>`).join('');
  const btn = doc.getElementById('band-listing');
  btn.addEventListener('click', () => {
    const open = drawer.hidden;
    drawer.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
}
```

- [ ] **Step 6: Wire it into `index.html`**

Add `<div id="band-drawer" class="drawer" hidden></div>` directly after `#band`, create `data/meetups.json` containing `[]`, and in the module script:

```js
import { mountBand } from './assets/js/meetups.js';
const meetups = await fetch('data/meetups.json').then(r => r.json());
mountBand(meetups);
```

- [ ] **Step 7: Style the band — ruled, no box, no fills**

```css
.band { display: flex; align-items: stretch; max-width: var(--measure);
        margin: 1.5rem auto 0; border-top: 1px solid var(--rule);
        border-bottom: 1px solid var(--rule); }
.band__ev { flex: 1; padding: .6rem .85rem; font: .8125rem/1.3 var(--sans);
            display: flex; align-items: center; }
.band__btn { background: none; border: 0; color: var(--ink);
             font: 700 .625rem/1 var(--sans); letter-spacing: .12em;
             text-transform: uppercase; padding: .6rem .85rem; cursor: pointer; }
.band__btn[disabled] { opacity: .4; cursor: default; }
.band__div { width: 1px; background: var(--rule); margin: .4rem 0; }
.drawer { max-width: var(--measure); margin: 0 auto; border-bottom: 1px solid var(--rule); }
.drawer__row { display: flex; justify-content: space-between; gap: 1rem;
               padding: .45rem .85rem; font: .8125rem/1.4 var(--sans);
               border-top: 1px dotted var(--rule); }
```

- [ ] **Step 8: Commit**

```bash
git add assets/js/meetups.js assets/css/site.css index.html data/meetups.json tests/meetups.test.mjs
git commit -m "Add the ruled meetup band, listing drawer and empty state"
```

---

### Task 4: The flip side

**Files:**
- Create: `assets/js/endorsements.js`, `data/endorsements.json`
- Modify: `index.html`, `assets/css/site.css`
- Test: `tests/endorsements.test.mjs`

**Interfaces:**
- Consumes: `#face-endorsements` from Task 1
- Produces: `voices(list)`, `needsCollapse(c)`, `collapse(c)`, `columns(list, n)`, `mountEndorsements(list, doc)`

- [ ] **Step 1: Write the failing test**

```js
// tests/endorsements.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voices, needsCollapse, collapse, columns, COLLAPSE_AT } from '../assets/js/endorsements.js';

const withComment = { id:'e-1', name:'Rosa Silva', trade:'Toolmaker', location:'Welland, ON', comment:'Short note.' };
const bare = { id:'e-2', name:'James Okafor', trade:'Controls tech', location:'Lackawanna, NY' };
const blank = { id:'e-3', name:'A', trade:'B', location:'C', comment:'   ' };

test('voices keeps only endorsements with real comment text', () => {
  assert.deepEqual(voices([withComment, bare, blank]).map(e => e.id), ['e-1']);
});

test('short comments are not collapsed', () => {
  assert.equal(needsCollapse('Short note.'), false);
  assert.equal(collapse('Short note.'), 'Short note.');
});

test('long comments collapse on a word boundary with an ellipsis', () => {
  const long = 'word '.repeat(200).trim();
  assert.equal(needsCollapse(long), true);
  const c = collapse(long);
  assert.ok(c.length <= COLLAPSE_AT + 1);
  assert.ok(c.endsWith('…'));
  assert.ok(!c.includes('wor…'));
});

test('columns splits in reading order down each column', () => {
  assert.deepEqual(columns([1,2,3,4,5], 2), [[1,2,3],[4,5]]);
});

test('columns never emits an empty trailing column', () => {
  assert.deepEqual(columns([1], 2), [[1]]);
  assert.deepEqual(columns([], 2), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/endorsements.test.mjs`
Expected: FAIL — cannot find module `../assets/js/endorsements.js`

- [ ] **Step 3: Write minimal implementation**

```js
// assets/js/endorsements.js
export const COLLAPSE_AT = 400;

export function voices(list) {
  return list.filter(e => typeof e.comment === 'string' && e.comment.trim().length > 0);
}

export function needsCollapse(comment) {
  return typeof comment === 'string' && comment.length > COLLAPSE_AT;
}

export function collapse(comment) {
  if (!needsCollapse(comment)) return comment;
  const cut = comment.lastIndexOf(' ', COLLAPSE_AT);
  return comment.slice(0, cut > 0 ? cut : COLLAPSE_AT).trimEnd() + '…';
}

export function columns(list, n) {
  if (list.length === 0) return [];
  const per = Math.ceil(list.length / n);
  const out = [];
  for (let i = 0; i < list.length; i += per) out.push(list.slice(i, i + per));
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/endorsements.test.mjs`
Expected: PASS, 5 tests

- [ ] **Step 5: Add the render**

Append to `assets/js/endorsements.js`:

```js
import { escapeHtml as esc } from './escape.js';   // add at the top of the file

function voiceRow(e) {
  const long = needsCollapse(e.comment);
  return `<article class="voice">
    <div class="voice__who"><b>${esc(e.name)}</b><br><span>${esc(e.trade)}</span><br><span>${esc(e.location)}</span></div>
    <div class="voice__body">
      <p>${esc(long ? collapse(e.comment) : e.comment)}</p>
      ${long ? `<button type="button" class="voice__more" data-full="${esc(e.comment)}">Read more +</button>` : ''}
    </div>
  </article>`;
}

export function mountEndorsements(list, doc = document) {
  const face = doc.getElementById('face-endorsements');
  const v = voices(list);
  face.innerHTML = `
    <nav class="subswitch">
      <button type="button" data-view="voices" aria-current="true">Voices</button>
      <button type="button" data-view="everyone" aria-current="false">Everyone</button>
      <span class="subswitch__count">${list.length} endorser${list.length === 1 ? '' : 's'}</span>
    </nav>
    <div id="view-voices">${v.map(voiceRow).join('') || '<p class="empty">No published comments yet.</p>'}</div>
    <div id="view-everyone" hidden class="everyone">
      ${columns(list, 2).map(col => `<div>${col.map(e =>
        `<div class="everyone__row"><b>${esc(e.name)}</b> · <span>${esc(e.trade)} · ${esc(e.location)}</span></div>`
      ).join('')}</div>`).join('')}
    </div>`;

  face.addEventListener('click', (ev) => {
    const view = ev.target.closest('[data-view]');
    if (view) {
      for (const b of face.querySelectorAll('[data-view]')) {
        const on = b === view;
        b.setAttribute('aria-current', String(on));
        doc.getElementById(`view-${b.dataset.view}`).hidden = !on;
      }
      return;
    }
    const more = ev.target.closest('.voice__more');
    if (more) {
      more.previousElementSibling.textContent = more.dataset.full;
      more.remove();
    }
  });
}
```

- [ ] **Step 6: Wire it in and seed the data file**

Create `data/endorsements.json` containing `[]`, then in `index.html`'s module script:

```js
import { mountEndorsements } from './assets/js/endorsements.js';
const endorsements = await fetch('data/endorsements.json').then(r => r.json());
mountEndorsements(endorsements);
```

- [ ] **Step 7: Style — margin attribution, two dense columns**

```css
#face-endorsements { max-width: 52rem; margin: 0 auto; }
.subswitch { display: flex; gap: 1.25rem; align-items: baseline;
             border-bottom: 1px solid var(--rule); padding: 1.5rem 0 .5rem; margin-bottom: 1.5rem; }
.subswitch button { background: none; border: 0; padding: 0; cursor: pointer;
                    color: var(--ink-soft); font: 700 .6875rem/1 var(--sans);
                    letter-spacing: .12em; text-transform: uppercase; }
.subswitch button[aria-current="true"] { color: var(--ink); }
.subswitch__count { margin-left: auto; color: var(--ink-soft);
                    font: .6875rem/1 var(--sans); letter-spacing: .06em; text-transform: uppercase; }
.voice { display: flex; gap: 1.5rem; margin-bottom: 1.75rem; }
.voice__who { flex: 0 0 34%; font: .75rem/1.55 var(--sans); }
.voice__who span { color: var(--ink-soft); }
.voice__body { flex: 1; }
.voice__body p { margin: 0; }
.voice__more { background: none; border: 0; padding: .35rem 0 0; cursor: pointer;
               color: var(--ink-soft); font: .625rem/1 var(--sans);
               letter-spacing: .1em; text-transform: uppercase; }
.everyone { display: flex; gap: 2rem; }
.everyone > div { flex: 1; }
.everyone__row { font: .75rem/1.9 var(--sans); }
.everyone__row span { color: var(--ink-soft); }
@media (max-width: 34rem) {
  .voice { display: block; }
  .voice__who { margin-bottom: .5rem; }
  .everyone { display: block; }
}
```

- [ ] **Step 8: Commit**

```bash
git add assets/js/endorsements.js assets/css/site.css index.html data/endorsements.json tests/endorsements.test.mjs
git commit -m "Add the endorsements flip side with Voices and Everyone views"
```

---

### Task 5: Shared submission module

**Files:**
- Create: `assets/js/submit.js`
- Test: `tests/submit.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `buildFormBody(values, entryMap) -> URLSearchParams`, `validateEndorsement(v) -> string[]`, `validateMeetup(v) -> string[]`, `MAX_COMMENT`, `submitTo(action, body) -> Promise<void>`

Both forms post to Google Forms from the page. One module, two consumers.

- [ ] **Step 1: Write the failing test**

```js
// tests/submit.test.mjs
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/submit.test.mjs`
Expected: FAIL — cannot find module `../assets/js/submit.js`

- [ ] **Step 3: Write minimal implementation**

```js
// assets/js/submit.js
export const MAX_COMMENT = 2500;

export function buildFormBody(values, entryMap) {
  const body = new URLSearchParams();
  for (const [field, entryId] of Object.entries(entryMap)) {
    const v = values[field];
    if (v !== undefined && v !== null && String(v).trim().length > 0) {
      body.append(entryId, String(v));
    }
  }
  return body;
}

const missing = (v, keys) => keys.filter(k => !String(v[k] ?? '').trim());

export function validateEndorsement(v) {
  const errors = missing(v, ['name', 'email', 'location', 'trade']);
  if (String(v.comment ?? '').length > MAX_COMMENT) errors.push('comment-too-long');
  return errors;
}

export function validateMeetup(v) {
  return missing(v, ['title', 'starts', 'venue']);
}

export async function submitTo(action, body) {
  await fetch(action, { method: 'POST', mode: 'no-cors', body });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/submit.test.mjs`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add assets/js/submit.js tests/submit.test.mjs
git commit -m "Add shared Google Form submission module"
```

---

### Task 6: The two on-page forms

**Files:**
- Modify: `index.html`, `assets/css/site.css`, `assets/js/meetups.js`

**Interfaces:**
- Consumes: `buildFormBody`, `validateEndorsement`, `validateMeetup`, `submitTo`, `MAX_COMMENT` from Task 5; `#band-add` from Task 3
- Produces: nothing consumed later

Both forms are on-page (spec §8.4) and post in the background. `＋ ADD` reveals the meetup form in place — no new tab.

- [ ] **Step 1: Add the endorse form to the statement face**

At the end of `#face-statement`, with the comment box sized to invite a real post:

```html
<section class="endorse">
  <h2>Endorse this</h2>
  <form id="endorse-form">
    <label>Name <input name="name" required autocomplete="name"></label>
    <label>Email <input name="email" type="email" required autocomplete="email"></label>
    <label>City / Town / Township <input name="location" required></label>
    <label>Trade / Expertise <input name="trade" required></label>
    <label class="endorse__comment">Your comment
      <textarea name="comment" rows="10" maxlength="2500"></textarea>
      <span class="counter" id="endorse-counter">0 / 2500</span>
    </label>
    <p class="notice">Comments are posted as written — we don't edit them. Please avoid defamatory or foul language.</p>
    <p class="fineprint">Your name, trade, town and comment are published. Your email is not — it is only used to reach you.</p>
    <button type="submit">Endorse</button>
    <p class="status" id="endorse-status" role="status"></p>
  </form>
</section>
```

- [ ] **Step 2: Add the meetup form, hidden until `＋ ADD`**

Directly after `#band-drawer`:

```html
<form id="meetup-form" class="addform" hidden>
  <label>What <input name="title" required placeholder="Open bench night"></label>
  <label>When <input name="starts" type="datetime-local" required></label>
  <label>Where <input name="venue" required placeholder="Welland Fabrication, 12 Ross St"></label>
  <label>Contact <input name="contact" required placeholder="email or phone"></label>
  <label>Calendar link <span class="opt">optional</span>
    <input name="calendar_url" type="url" placeholder="paste any calendar link"></label>
  <button type="submit">Post it</button>
  <p class="status" id="meetup-status" role="status"></p>
</form>
```

- [ ] **Step 3: Wire both forms**

Replace `FORM_URL_*` and `entry.*` with the real ids once the Google Forms exist (Task 8).

```js
import { buildFormBody, validateEndorsement, validateMeetup, submitTo, MAX_COMMENT } from './assets/js/submit.js';

const ENDORSE_ACTION = 'FORM_URL_ENDORSE';
const ENDORSE_MAP = { name:'entry.0', email:'entry.0', location:'entry.0', trade:'entry.0', comment:'entry.0' };
const MEETUP_ACTION = 'FORM_URL_MEETUP';
const MEETUP_MAP = { title:'entry.0', starts:'entry.0', venue:'entry.0', contact:'entry.0', calendar_url:'entry.0' };

function wire(formId, statusId, map, action, validate, done) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const errors = validate(values);
    if (errors.length) {
      status.textContent = errors.includes('comment-too-long')
        ? `Your comment is over the ${MAX_COMMENT}-character limit.`
        : 'Please fill in every required field.';
      return;
    }
    status.textContent = 'Sending…';
    try {
      await submitTo(action, buildFormBody(values, map));
      form.reset();
      status.textContent = done;
    } catch {
      status.textContent = 'That did not go through. Please try again.';
    }
  });
}

wire('endorse-form', 'endorse-status', ENDORSE_MAP, ENDORSE_ACTION, validateEndorsement,
     'Thank you — your endorsement is in. It appears once reviewed.');
wire('meetup-form', 'meetup-status', MEETUP_MAP, MEETUP_ACTION, validateMeetup,
     'Thank you — your meetup is in. It appears once reviewed.');

const counter = document.getElementById('endorse-counter');
const box = document.querySelector('#endorse-form [name=comment]');
box.addEventListener('input', () => { counter.textContent = `${box.value.length} / ${MAX_COMMENT}`; });

document.getElementById('band-add').addEventListener('click', () => {
  const f = document.getElementById('meetup-form');
  f.hidden = !f.hidden;
  if (!f.hidden) f.querySelector('input').focus();
});
```

- [ ] **Step 4: Style the forms**

```css
.endorse { max-width: var(--measure); margin: 3rem auto 0;
           border-top: 1px solid var(--rule); padding-top: 1.5rem; }
.endorse h2 { font: 400 1.375rem/1.2 var(--serif); margin: 0 0 1rem; }
form label { display: block; margin-bottom: .9rem; font: .6875rem/1.6 var(--sans);
             letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); }
form input, form textarea { display: block; width: 100%; margin-top: .3rem;
  background: transparent; border: 1px solid var(--rule); color: var(--ink);
  font: 1rem/1.5 var(--serif); padding: .5rem .6rem; text-transform: none; letter-spacing: 0; }
.endorse__comment textarea { min-height: 12rem; resize: vertical; }
.counter { display: block; text-align: right; font: .625rem/1.8 var(--sans); color: var(--ink-soft); }
.notice { font: .75rem/1.5 var(--sans); color: var(--ink); margin: .25rem 0 .5rem; }
.fineprint, .opt { font: .6875rem/1.5 var(--sans); color: var(--ink-soft); text-transform: none; letter-spacing: 0; }
form button { background: var(--ink); color: var(--paper); border: 0; cursor: pointer;
              font: 700 .6875rem/1 var(--sans); letter-spacing: .12em;
              text-transform: uppercase; padding: .75rem 1.5rem; }
.status { font: .75rem/1.5 var(--sans); color: var(--ink-soft); min-height: 1.2em; }
.addform { max-width: var(--measure); margin: 1rem auto 0;
           border-bottom: 1px solid var(--rule); padding-bottom: 1.25rem; }
```

- [ ] **Step 5: Verify by hand**

Run: `python3 -m http.server 8019`

- [ ] `＋ ADD` reveals the meetup form in place; no new tab opens
- [ ] Submitting an empty endorse form shows the missing-fields message, not a network call
- [ ] The counter tracks and the textarea stops at 2,500
- [ ] The publishing notice is present, worded exactly as in Global Constraints

- [ ] **Step 6: Commit**

```bash
git add index.html assets/css/site.css
git commit -m "Add on-page endorse and add-a-meetup forms"
```

---

### Task 7: Approval write script and workflow

**Files:**
- Create: `scripts/approve_request.py`, `.github/workflows/approve-request.yml`
- Test: `tests/test_approve_request.py`

**Interfaces:**
- Consumes: `data/endorsements.json`, `data/meetups.json` from Tasks 3–4
- Produces: `extract_block(body) -> dict`, `apply_label_override(record, env) -> dict`, `validate(record) -> list[str]`, `next_id(records, prefix) -> str`, `append_record(path, record) -> dict`

The Apps Script writes a hidden JSON block into the issue; this script is the only thing that writes the public data files. **Email is dropped here as well as upstream** — defence in depth, because this is the last gate before a public commit.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_approve_request.py
import json, tempfile, unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import approve_request as ar

ISSUE = """Someone endorsed.

<!--DATA
{"kind":"endorsement","name":"Rosa Silva","trade":"Toolmaker",
 "location":"Welland, ON","email":"rosa@example.ca","comment":"Count me in."}
DATA-->
"""

class TestExtract(unittest.TestCase):
    def test_pulls_the_json_out_of_the_comment(self):
        self.assertEqual(ar.extract_block(ISSUE)["name"], "Rosa Silva")

    def test_missing_block_raises(self):
        with self.assertRaises(ValueError):
            ar.extract_block("no data here")

class TestValidate(unittest.TestCase):
    def test_endorsement_requires_its_fields(self):
        self.assertEqual(sorted(ar.validate({"kind": "endorsement"})),
                         ["location", "name", "trade"])

    def test_comment_over_cap_is_rejected(self):
        rec = {"kind":"endorsement","name":"a","trade":"b","location":"c","comment":"x"*2501}
        self.assertIn("comment-too-long", ar.validate(rec))

    def test_unknown_kind_is_rejected(self):
        self.assertIn("kind", ar.validate({"kind": "nonsense"}))

    def test_meetup_requires_its_fields(self):
        self.assertEqual(sorted(ar.validate({"kind": "meetup"})),
                         ["starts", "title", "venue"])

class TestWrite(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "endorsements.json"
        self.path.write_text("[]")

    def tearDown(self):
        self.dir.cleanup()

    def test_email_never_reaches_the_file(self):
        ar.append_record(self.path, ar.extract_block(ISSUE))
        written = json.loads(self.path.read_text())
        self.assertNotIn("email", written[0])
        self.assertEqual(written[0]["name"], "Rosa Silva")

    def test_comment_is_dropped_unless_publish_comment_is_set(self):
        rec = ar.extract_block(ISSUE)
        rec["publish_comment"] = False
        ar.append_record(self.path, rec)
        self.assertNotIn("comment", json.loads(self.path.read_text())[0])

    def test_publish_comment_label_overrides_the_block(self):
        rec = ar.extract_block(ISSUE)          # block says nothing
        rec["publish_comment"] = True          # ...or even says publish
        ar.apply_label_override(rec, {"PUBLISH_COMMENT": "false"})
        ar.append_record(self.path, rec)
        self.assertNotIn("comment", json.loads(self.path.read_text())[0])

    def test_publish_comment_label_present_publishes(self):
        rec = ar.apply_label_override(ar.extract_block(ISSUE),
                                      {"PUBLISH_COMMENT": "true"})
        ar.append_record(self.path, rec)
        self.assertEqual(json.loads(self.path.read_text())[0]["comment"],
                         "Count me in.")

    def test_absent_env_leaves_the_record_alone(self):
        rec = {"kind": "endorsement", "publish_comment": False}
        ar.apply_label_override(rec, {})
        self.assertIs(rec["publish_comment"], False)

    def test_ids_increment(self):
        ar.append_record(self.path, ar.extract_block(ISSUE))
        ar.append_record(self.path, ar.extract_block(ISSUE))
        ids = [r["id"] for r in json.loads(self.path.read_text())]
        self.assertEqual(ids, ["e-0001", "e-0002"])

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'approve_request'`

- [ ] **Step 3: Write minimal implementation**

```python
#!/usr/bin/env python3
"""Turn an approved GitHub Issue into a committed record.

The only writer of data/*.json. Email is dropped here as well as upstream:
this is the last gate before a public commit, and the repo keeps history.
"""
import json, os, re, sys
from datetime import date
from pathlib import Path

MAX_COMMENT = 2500
BLOCK = re.compile(r"<!--DATA\s*(\{.*?\})\s*DATA-->", re.S)
REQUIRED = {
    "endorsement": ["name", "trade", "location"],
    "meetup": ["title", "starts", "venue"],
}
TARGET = {"endorsement": ("data/endorsements.json", "e"),
          "meetup": ("data/meetups.json", "m")}
PUBLIC = {
    "endorsement": ["id", "name", "trade", "location", "comment", "date"],
    "meetup": ["id", "title", "starts", "venue", "contact", "calendar_url"],
}


def extract_block(issue_body):
    m = BLOCK.search(issue_body or "")
    if not m:
        raise ValueError("no <!--DATA ... DATA--> block in the issue body")
    return json.loads(m.group(1))


def validate(record):
    kind = record.get("kind")
    if kind not in REQUIRED:
        return ["kind"]
    errors = [f for f in REQUIRED[kind] if not str(record.get(f, "")).strip()]
    if len(str(record.get("comment", ""))) > MAX_COMMENT:
        errors.append("comment-too-long")
    return errors


def next_id(records, prefix):
    n = 0
    for r in records:
        try:
            n = max(n, int(str(r.get("id", "")).split("-")[-1]))
        except ValueError:
            continue
    return f"{prefix}-{n + 1:04d}"


def append_record(path, record):
    path = Path(path)
    kind = record.get("kind", "endorsement")
    prefix = TARGET[kind][1]
    records = json.loads(path.read_text() or "[]")

    out = {"id": next_id(records, prefix)}
    for field in PUBLIC[kind]:
        if field == "id":
            continue
        if field == "date":
            out["date"] = record.get("date") or date.today().isoformat()
        elif field == "comment":
            if record.get("publish_comment", True) and str(record.get("comment", "")).strip():
                out["comment"] = record["comment"]
        elif str(record.get(field, "")).strip():
            out[field] = record[field]

    records.append(out)
    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n")
    return out


def apply_label_override(record, env):
    """Spec §8.3: the publish-comment decision is a LABEL on the issue, not a
    field an editor hand-edits into the JSON block. The workflow reads the
    issue's label set and passes it in; it overrides whatever the block said.
    Absent env (e.g. a local run) leaves the record untouched.
    """
    if "PUBLISH_COMMENT" in env:
        record["publish_comment"] = env["PUBLISH_COMMENT"] == "true"
    return record


def main():
    record = apply_label_override(
        extract_block(os.environ.get("ISSUE_BODY", "")), os.environ)
    errors = validate(record)
    if errors:
        print(f"invalid record, missing or bad: {', '.join(errors)}", file=sys.stderr)
        return 1
    written = append_record(TARGET[record["kind"]][0], record)
    print(f"wrote {written['id']} to {TARGET[record['kind']][0]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest discover -s tests -v`
Expected: PASS, 9 tests

- [ ] **Step 5: Add the workflow**

```yaml
# .github/workflows/approve-request.yml
name: Approve request
on:
  issues:
    types: [labeled]
permissions:
  contents: write
  issues: write
jobs:
  write:
    if: github.event.label.name == 'approved'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Write the record
        env:
          ISSUE_BODY: ${{ github.event.issue.body }}
          # Spec §8.3: both labels are required for a comment to be published.
          # `approved` gates the job; `publish-comment` gates the comment text.
          PUBLISH_COMMENT: ${{ contains(github.event.issue.labels.*.name, 'publish-comment') }}
        run: python3 scripts/approve_request.py
      - name: Commit
        run: |
          git config user.name "niagara-assembly-bot"
          git config user.email "noreply@niagaraassembly.com"
          git add data/
          git diff --staged --quiet || git commit -m "Add record from #${{ github.event.issue.number }}"
          git push
      - name: Close the issue
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh issue close ${{ github.event.issue.number }} --repo ${{ github.repository }}
```

- [ ] **Step 6: Commit**

```bash
git add scripts/approve_request.py tests/test_approve_request.py .github/workflows/approve-request.yml
git commit -m "Add approval write script and workflow"
```

---

### Task 8: Apps Script processors

**Files:**
- Create: `google-apps-script/endorse.gs`, `google-apps-script/meetup.gs`

**Interfaces:**
- Consumes: the issue format `approve_request.py` parses (Task 7)
- Produces: GitHub Issues carrying a `<!--DATA … DATA-->` block

**These files are never run from this repo.** Google reads nothing here; they are version-controlled and deployed by pasting into the bound Sheet's Apps Script editor. Each carries a `runSelfTest` so a paste can be verified immediately.

- [ ] **Step 1: Write `google-apps-script/endorse.gs`**

```javascript
/**
 * Bound to the Endorse form's response Sheet.
 * Deploy: open the Sheet → Extensions → Apps Script → paste → Save →
 * run runSelfTest → confirm "RESULT: all checks passed".
 * Script Properties required: GITHUB_TOKEN, KIT_API_KEY.
 */
var REPO = 'niagaraassembly/site';
var MAX_COMMENT = 2500;

function buildIssueBody(r) {
  var data = {
    kind: 'endorsement',
    name: r.name, trade: r.trade, location: r.location,
    comment: (r.comment || '').slice(0, MAX_COMMENT)
  };
  // Two labels, per spec §8.3. The workflow reads the issue's label set and
  // passes the comment decision to approve_request.py, so nothing in this
  // block controls publication — an editor never hand-edits the JSON.
  return 'Endorsement from ' + r.name + ' — ' + r.trade + ', ' + r.location +
         '\n\n**`approved`** — add this label to put them on the roster.\n' +
         '**`publish-comment`** — add this one too to publish their comment.\n' +
         'Adding `approved` alone keeps them on the roster with the comment withheld.\n\n' +
         '<!--DATA\n' + JSON.stringify(data, null, 1) + '\nDATA-->';
}

function onFormSubmit(e) {
  var r = mapResponse_(e);
  upsertKit_(r);
  createIssue_('Endorsement — ' + r.name + ' (' + r.location + ')', buildIssueBody(r), ['endorsement']);
}

function mapResponse_(e) {
  var v = e.namedValues;
  var pick = function (k) { return (v[k] && v[k][0] ? v[k][0] : '').trim(); };
  return { name: pick('Name'), email: pick('Email'), location: pick('City / Town / Township'),
           trade: pick('Trade / Expertise'), comment: pick('Comment') };
}

function createIssue_(title, body, labels) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + '/issues', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({ title: title, body: body, labels: labels }),
    muteHttpExceptions: true
  });
}

function upsertKit_(r) {
  var key = PropertiesService.getScriptProperties().getProperty('KIT_API_KEY');
  if (!key) return;
  UrlFetchApp.fetch('https://api.convertkit.com/v3/tags', {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ api_key: key, email: r.email, first_name: r.name }),
    muteHttpExceptions: true
  });
}

function runSelfTest() {
  var body = buildIssueBody({ name: 'Rosa Silva', trade: 'Toolmaker',
                              location: 'Welland, ON', comment: 'Count me in.' });
  var m = body.match(/<!--DATA\s*([\s\S]*?)\s*DATA-->/);
  if (!m) throw new Error('FAIL: no data block');
  var parsed = JSON.parse(m[1]);
  if (parsed.kind !== 'endorsement') throw new Error('FAIL: wrong kind');
  if (parsed.name !== 'Rosa Silva') throw new Error('FAIL: name not carried');
  if ('email' in parsed) throw new Error('FAIL: email must never enter the issue');
  if ('publish_comment' in parsed) throw new Error('FAIL: publication is a label, not a field');
  Logger.log('RESULT: all checks passed');
}
```

- [ ] **Step 2: Write `google-apps-script/meetup.gs`**

Same shape, no Kit call, `kind: 'meetup'`, fields `title / starts / venue / contact / calendar_url`, mapped from the form's `What / When / Where / Contact / Calendar link` questions, with its own `runSelfTest` asserting `parsed.kind === 'meetup'` and that `starts` survives.

- [ ] **Step 3: Record the deployment procedure**

Create `google-apps-script/README.md` stating: Google never reads this repo; each `.gs` deploys by pasting into its bound Sheet's Apps Script editor, Save, then run `runSelfTest`; installable triggers bind to the function name and always run the current saved code, so a trigger needs no re-setup after a paste.

- [ ] **Step 4: Commit**

```bash
git add google-apps-script/
git commit -m "Add Apps Script processors for both forms"
```

---

### Task 9: Deploy

**Files:**
- Create: `CNAME`, `.nojekyll`, `README.md`

- [ ] **Step 1: Add Pages config**

```bash
echo "niagaraassembly.com" > CNAME
touch .nojekyll
```

- [ ] **Step 2: Write `README.md`**

Cover: what the site is, `python3 -m http.server 8019` to run it, `node --test tests/` and `python3 -m unittest discover -s tests` to test it, the two pipelines in one diagram, that `google-apps-script/*.gs` deploys by pasting, and that `data/*.json` is written only by the Action.

- [ ] **Step 3: Run the full suite**

```bash
node --test tests/
python3 -m unittest discover -s tests -v
```
Expected: all pass, no failures.

- [ ] **Step 4: Commit and enable Pages**

```bash
git add CNAME .nojekyll README.md
git commit -m "Add Pages configuration and README"
```

Then in repo Settings → Pages, serve from `main` at root, and point the `niagaraassembly.com` DNS at GitHub Pages.

---

## Self-Review

**Spec coverage.** §5 statement → Task 2. §6.1 band → Task 3. §6.2 flip side → Task 4. §7 data model → Tasks 3, 4, 7. §8 pipelines → Tasks 5–8. §8.2 notice → Task 6 Step 1. §8.3 gate → Task 7 (`publish_comment`) and Task 8 (issue copy). §9 stack → Tasks 1, 9.

**Two spec items deliberately not tasked, both recorded in spec §11:** the bot filters of §8.3 (honeypot, rate limit, link cap, slur blocklist) belong in Apps Script and are better written against a live form once real spam is observed — Task 8 leaves the seam. And spec §11.1's verification of the Bell Aircraft claim is research, not code; it gates Task 2's copy checklist.

**Placeholder scan.** `FORM_URL_ENDORSE`, `FORM_URL_MEETUP` and the `entry.0` ids in Task 6 Step 3 are the only unresolved values. They are real Google Form ids that cannot exist until the Forms are created in Task 8, and Task 6 Step 3 says so explicitly. Everything else is literal.

**Type consistency.** `formatMeetupLine` is used by name in Tasks 3 Steps 3 and 5. `needsCollapse`/`collapse`/`voices`/`columns` are defined in Task 4 Step 3 and consumed in Step 5. `buildFormBody`/`validateEndorsement`/`validateMeetup`/`submitTo`/`MAX_COMMENT` are defined in Task 5 and consumed in Task 6. `extract_block`/`validate`/`append_record`/`next_id` match between the test and the implementation in Task 7. The `<!--DATA … DATA-->` delimiter is identical in Task 7's `BLOCK` regex and Task 8's `buildIssueBody` and `runSelfTest`.
