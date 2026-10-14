/* The Reader: one reading panel for the whole site.
 *
 * Opened from the book icon in the header (sitenav.js), or by any element
 * with data-reader-open="<item id>" (an article URL, or a desk issue URL).
 * It reads data/reader.json (scripts/reader/build.mjs) and steps forward
 * and back through it in published order, optionally within one
 * publication.
 *
 * What has been read is remembered in this browser only (localStorage,
 * key "na-reader"); nothing is sent anywhere. Read items drop out of the
 * cycle unless "Show read" is on. If storage is unavailable the Reader
 * still works and simply forgets.
 *
 * Loaded on demand: sitenav.js imports this module the first time the
 * Reader is asked for, so pages that never open it never download it.
 */

import { escapeHtml as e, safeHttpUrl } from './escape.js';

const STORE = 'na-reader';
const MIN_SECONDS = 8;   // time on an item before moving on marks it read

/* ---- pure helpers (tested in tests/reader.test.mjs) --------------------- */

export function cycle(items, { publication = '', showRead = false, read = new Set(), keep = '' } = {}) {
  return items.filter((i) => (!publication || i.publication === publication) && (showRead || !read.has(i.id) || i.id === keep));
}

export function startingPoint(items, read) {
  return items.find((i) => !read.has(i.id)) ?? null;
}

export function neighbours(list, id) {
  const n = list.findIndex((i) => i.id === id);
  return { index: n, prev: n > 0 ? list[n - 1] : null, next: n >= 0 && n < list.length - 1 ? list[n + 1] : null };
}

/* ---- storage ------------------------------------------------------------- */

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || '{}');
    return { read: new Set(Array.isArray(raw.read) ? raw.read : []), showRead: !!raw.showRead, publication: String(raw.publication || '') };
  } catch {
    return { read: new Set(), showRead: false, publication: '' };
  }
}
function saveState(s) {
  try { localStorage.setItem(STORE, JSON.stringify({ read: [...s.read], showRead: s.showRead, publication: s.publication })); } catch { /* private mode: forget */ }
}

/* ---- content ------------------------------------------------------------- */

const DATE = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const dated = (iso) => (iso ? DATE.format(new Date(`${iso}T00:00:00Z`)) : '');
const cache = new Map();

/* An article page's .article, with links and images made absolute so they
   still work from whatever page the Reader is open on. */
async function articleHtml(item) {
  const res = await fetch(item.id);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  const article = doc.querySelector('.article');
  if (!article) throw new Error('no .article');
  const base = new URL(item.id, location.origin);
  for (const el of article.querySelectorAll('[href]')) el.setAttribute('href', new URL(el.getAttribute('href'), base).href);
  for (const el of article.querySelectorAll('[src]')) el.setAttribute('src', new URL(el.getAttribute('src'), base).href);
  for (const el of article.querySelectorAll('script, [data-sketch]')) el.removeAttribute('data-sketch');
  article.querySelectorAll('script').forEach((s) => s.remove());
  return article.innerHTML;
}

const money = (n, cur) => (n == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n));
const words = (s) => String(s ?? '').replace(/_/g, ' ');

/* A desk issue as a write-up: the edition's summary, then each story with
   its stage, amount, place and sources. Built from the frozen edition data
   so it reads exactly as that issue was published. */
async function deskIssueHtml(item) {
  const res = await fetch(item.data);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const issue = (data.issues ?? [])[0] ?? {};
  const ids = new Set(issue.events ?? []);
  const stories = (data.items ?? []).filter((i) => (!ids.size || ids.has(i.id)) && ['approved', 'published'].includes(i.publish_status));
  const body = stories.map((s) => {
    const facts = [words(s.stage), money(s.amount, s.currency), s.place].filter(Boolean).map((f) => e(f)).join(', ');
    const sources = (s.sources ?? []).map((src) => `<li><a href="${e(safeHttpUrl(src.url) || '#')}" rel="noopener">${e(src.title || src.publisher)}</a>${src.publisher ? `, ${e(src.publisher)}` : ''}</li>`).join('');
    return `<section class="reader-story"><h2>${e(s.headline)}</h2><p class="reader-story__facts">${facts}</p>${s.note ? `<p>${e(s.note)}</p>` : ''}`
      + (s.next_step?.text ? `<p class="reader-story__next">Next: ${e(s.next_step.text)}${s.next_step.date ? ` (${e(s.next_step.date)})` : ''}</p>` : '')
      + (sources ? `<details class="reader-story__sources"><summary>Sources (${s.sources.length})</summary><ul>${sources}</ul></details>` : '')
      + '</section>';
  }).join('');
  return `<h1>${e(item.title)}</h1>`
    + `<p class="mag-date">${e([dated(issue.published || item.date), issue.coverage_start && issue.coverage_end ? `news from ${dated(issue.coverage_start)} to ${dated(issue.coverage_end)}` : ''].filter(Boolean).join(', '))}</p>`
    + (issue.summary ? `<p class="reader-lede">${e(issue.summary)}</p>` : '')
    + body
    + `<p class="reader-note">Every story passed Niagara Assembly’s source review. <a href="${e(item.id)}">Open the full issue</a> for the map, county band and dollar figures.</p>`;
}

async function contentFor(item) {
  if (!cache.has(item.id)) cache.set(item.id, item.kind === 'desk-issue' ? deskIssueHtml(item) : articleHtml(item));
  return cache.get(item.id);
}

/* ---- panel ----------------------------------------------------------------- */

const ICON_PREV = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const ICON_NEXT = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

let ui = null;

async function setup() {
  if (!document.querySelector('link[href="/assets/css/reader.css"]')) {
    const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: '/assets/css/reader.css' });
    const loaded = new Promise((done) => { css.onload = done; css.onerror = done; });
    document.head.append(css);
    await loaded;
  }
  const res = await fetch('/data/reader.json');
  if (!res.ok) throw new Error(`reader.json: HTTP ${res.status}`);
  const items = (await res.json()).items;
  const publications = [...new Set(items.map((i) => i.publication))];
  const state = loadState();
  if (state.publication && !publications.includes(state.publication)) state.publication = '';

  const root = document.createElement('div');
  root.className = 'reader';
  root.hidden = true;
  root.innerHTML = `<div class="reader__scrim" data-reader-close></div>
<section class="reader__panel" role="dialog" aria-modal="true" aria-labelledby="reader-heading">
<header class="reader__head">
<div class="reader__bar"><h2 class="reader__brand" id="reader-heading">Reader</h2>
<label class="reader__pub"><span class="visually-hidden">Publication</span><select data-reader-pub><option value="">All publications</option>${publications.map((p) => `<option>${e(p)}</option>`).join('')}</select></label>
<button type="button" class="reader__close" data-reader-close aria-label="Close the Reader">×</button></div>
<div class="reader__bar reader__bar--nav"><button type="button" class="reader__step" data-reader-prev>${ICON_PREV}<span>Previous</span></button>
<p class="reader__pos" data-reader-pos aria-live="polite"></p>
<button type="button" class="reader__step" data-reader-next><span>Next</span>${ICON_NEXT}</button></div>
</header>
<div class="reader__scroll" data-reader-scroll><p class="reader__from" data-reader-from></p><article class="article reader__body" data-reader-body tabindex="-1"></article></div>
<footer class="reader__foot"><label class="reader__showread"><input type="checkbox" data-reader-showread> Show read</label>
<button type="button" class="reader__mark" data-reader-mark></button>
<a class="reader__full" data-reader-full href="#">Open as a page ↗</a></footer>
</section>`;
  document.body.append(root);
  const $ = (sel) => root.querySelector(sel);
  ui = { root, items, state, current: null, shownAt: 0, opener: null, $ };

  $('[data-reader-pub]').value = state.publication;
  $('[data-reader-showread]').checked = state.showRead;
  root.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-reader-close]')) close();
    else if (ev.target.closest('[data-reader-prev]')) step(-1);
    else if (ev.target.closest('[data-reader-next]')) step(1);
    else if (ev.target.closest('[data-reader-mark]')) toggleRead();
  });
  $('[data-reader-pub]').addEventListener('change', (ev) => {
    state.publication = ev.target.value;
    saveState(state);
    leave();
    show(startingPoint(list(), state.read) ?? (state.showRead ? list()[0] : null));
  });
  $('[data-reader-showread]').addEventListener('change', (ev) => {
    state.showRead = ev.target.checked;
    saveState(state);
    render();
  });
  root.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') close();
    if (ev.target.closest('select, input')) return;
    if (ev.key === 'ArrowLeft') step(-1);
    if (ev.key === 'ArrowRight') step(1);
    if (ev.key === 'Tab') trap(ev);
  });
}

const list = () => cycle(ui.items, { publication: ui.state.publication, showRead: ui.state.showRead, read: ui.state.read, keep: ui.current?.id });

/* Leaving an item after a real look marks it read. */
function leave() {
  if (ui.current && Date.now() - ui.shownAt >= MIN_SECONDS * 1000) {
    ui.state.read.add(ui.current.id);
    saveState(ui.state);
  }
}

function step(dir) {
  const { prev, next } = neighbours(list(), ui.current?.id);
  const target = dir < 0 ? prev : next;
  if (!target) return;
  leave();
  show(target);
}

function toggleRead() {
  const id = ui.current?.id;
  if (!id) return;
  if (ui.state.read.has(id)) ui.state.read.delete(id); else ui.state.read.add(id);
  ui.shownAt = Date.now() + 1e12;   // a manual choice is not overridden on leaving
  saveState(ui.state);
  render();
}

function render() {
  const { $, state } = ui;
  const items = list();
  const item = ui.current;
  const { index, prev, next } = neighbours(items, item?.id);
  $('[data-reader-prev]').disabled = !prev;
  $('[data-reader-next]').disabled = !next;
  const unread = cycle(ui.items, { publication: state.publication, read: state.read }).length;
  $('[data-reader-pos]').textContent = item
    ? `${index + 1} of ${items.length}${state.showRead ? '' : ' unread'}`
    : `${unread} unread`;
  $('[data-reader-mark]').hidden = !item;
  $('[data-reader-mark]').textContent = item && state.read.has(item.id) ? 'Mark as unread' : 'Mark as read';
  $('[data-reader-full]').hidden = !item;
  if (item) $('[data-reader-full]').href = item.id;
}

async function show(item) {
  const { $ } = ui;
  ui.current = item;
  ui.shownAt = Date.now();
  const body = $('[data-reader-body]');
  const from = $('[data-reader-from]');
  render();
  if (!item) {
    from.textContent = '';
    body.innerHTML = `<h1>You’re all caught up</h1><p>You have read everything${ui.state.publication ? ` in ${e(ui.state.publication)}` : ''}. Turn on <b>Show read</b> to go back through it, or choose another publication.</p>`;
    return;
  }
  const place = [item.publication, item.edition].filter(Boolean).join(', ');
  from.textContent = place === item.title ? '' : place;
  body.innerHTML = '<p class="reader__loading">Loading…</p>';
  try {
    const html = await contentFor(item);
    if (ui.current !== item) return;
    body.innerHTML = html;
  } catch (error) {
    console.error(error);
    if (ui.current !== item) return;
    cache.delete(item.id);
    body.innerHTML = `<h1>${e(item.title)}</h1><p>This piece did not load. <a href="${e(item.id)}">Open it as a page</a> instead.</p>`;
  }
  $('[data-reader-scroll]').scrollTop = 0;
}

function trap(ev) {
  const focusable = [...ui.root.querySelectorAll('button:not([disabled]), select, input, a[href], [tabindex="-1"]')].filter((el) => !el.hidden && el.offsetParent !== null);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
  else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
}

function close() {
  if (!ui || ui.root.hidden) return;
  leave();
  ui.root.hidden = true;
  document.documentElement.classList.remove('reader-open');
  ui.opener?.focus?.();
}

/** Open the Reader on an item id, or on the first unread item. */
export async function openReader(id = '', opener = document.activeElement) {
  if (!ui) await setup();
  ui.opener = opener;
  ui.root.hidden = false;
  document.documentElement.classList.add('reader-open');
  let item = id ? ui.items.find((i) => i.id === id) : null;
  if (item && ui.state.publication && item.publication !== ui.state.publication) {
    /* Opening a specific piece widens the cycle to its publication. */
    ui.state.publication = item.publication;
    ui.$('[data-reader-pub]').value = item.publication;
  }
  if (!item) item = ui.current ?? startingPoint(list(), ui.state.read);
  if (item !== ui.current) { leave(); await show(item); } else render();
  ui.$('[data-reader-body]').focus({ preventScroll: true });
  ui.$('[data-reader-scroll]').scrollTop = 0;
}
