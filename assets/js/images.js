/* The image gallery, at /images/ and in miniature on magazine pages.
 *
 * Reads data/images.json (built by scripts/images/build.mjs). Filters live
 * in the URL (?section=&magazine=&issue=&article=), so a magazine page can
 * link straight to its own pictures.
 *
 *   mountStrip(el, { magazine, limit })  a row of thumbnails for a magazine
 *                                        landing page, linking to the gallery
 */

import { escapeHtml as e, safeHttpUrl } from './escape.js';

const KEYS = ['section', 'magazine', 'issue', 'article'];
const LABEL = { section: 'Where', magazine: 'Magazine', issue: 'Issue', article: 'Article or block' };

export async function loadImages() {
  const r = await fetch('/data/images.json');
  if (!r.ok) throw new Error(`images.json: HTTP ${r.status}`);
  return (await r.json()).images;
}

export function filterImages(images, state) {
  return images.filter((i) => KEYS.every((k) => !state[k] || i[k] === state[k]));
}

const local = (href) => (/^\/(?!\/)/.test(String(href ?? '')) ? String(href) : '#');
const link = (href) => e(safeHttpUrl(href) || local(href));

/* Where an image appears, in words: "START, Issue 1 — September 2026",
   "Homepage", "Desks". */
export function placeOf(i) {
  return i.section === 'Magazines' ? [i.magazine, i.issue].filter(Boolean).join(', ') : i.section;
}

export function tile(i) {
  return `<li class="image-tile"><a class="image-tile__frame" href="${link(i.article_href)}">`
    + `<img src="${link(i.thumb)}" alt="${e(i.alt)}" loading="lazy"></a>`
    + `<div class="image-tile__text"><p class="image-tile__title"><a href="${link(i.article_href)}">${e(i.article)}</a></p>`
    + `<p class="image-tile__place">${e(placeOf(i))}</p>`
    + `<p class="image-tile__credit">${e(i.credit)}`
    + (i.source ? ` <a href="${link(i.source)}" rel="noopener">Source</a>` : '')
    + '</p></div></li>';
}

function mountGallery(root) {
  const form = root.querySelector('#images-filters');
  const grid = root.querySelector('#images-grid');
  const count = root.querySelector('#images-count');
  loadImages().then((images) => {
    function draw() {
      const state = Object.fromEntries(KEYS.map((k) => [k, new URLSearchParams(location.search).get(k) || '']));
      /* Each list offers only what the choices before it allow, with counts. */
      KEYS.forEach((key, n) => {
        const before = Object.fromEntries(KEYS.slice(0, n).map((k) => [k, state[k]]));
        const pool = filterImages(images, before);
        const counts = new Map();
        for (const i of pool) if (i[key]) counts.set(i[key], (counts.get(i[key]) ?? 0) + 1);
        const select = form.elements[key];
        const first = select.options[0].outerHTML;
        select.innerHTML = first + [...counts].map(([v, c]) => `<option value="${e(v)}">${e(v)} (${c})</option>`).join('');
        select.value = counts.has(state[key]) ? state[key] : '';
        select.closest('label').hidden = key !== 'section' && counts.size === 0;
        state[key] = select.value;
      });
      const shown = filterImages(images, state);
      grid.innerHTML = shown.map(tile).join('');
      const scope = KEYS.filter((k) => state[k]).map((k) => `${LABEL[k]}: ${state[k]}`);
      count.textContent = `${shown.length} ${shown.length === 1 ? 'image' : 'images'}${scope.length ? `, ${scope.join('; ')}` : ''}`;
    }
    form.addEventListener('change', (event) => {
      const p = new URLSearchParams();
      const changed = KEYS.indexOf(event.target.name);
      /* A narrower choice under a changed broader one may no longer exist. */
      KEYS.forEach((k, n) => { if (form.elements[k].value && (n <= changed)) p.set(k, form.elements[k].value); });
      history.replaceState(null, '', `?${p}`);
      draw();
    });
    window.addEventListener('popstate', draw);
    draw();
  }).catch((error) => {
    console.error(error);
    count.textContent = 'The gallery did not load. Reload the page to try again.';
  });
}

export async function mountStrip(el, { magazine, limit = 6 }) {
  try {
    const images = filterImages(await loadImages(), { section: 'Magazines', magazine });
    const href = `/images/?section=Magazines&magazine=${encodeURIComponent(magazine)}`;
    if (!images.length) {
      el.innerHTML = `<p class="image-strip__empty">Pictures published in ${e(magazine)} articles collect here. <a href="/images/">See every image on the site</a>.</p>`;
      return;
    }
    el.innerHTML = `<ul class="image-strip__row">${images.slice(0, limit).map((i) =>
      `<li><a href="${link(i.article_href)}"><img src="${link(i.thumb)}" alt="${e(i.alt)}" loading="lazy"><span>${e(i.article)}</span></a></li>`).join('')}</ul>`
      + `<p class="image-strip__more"><a href="${e(href)}">${images.length === 1 ? 'See it in the image gallery' : `All ${images.length} images from ${e(magazine)}`} ↗</a></p>`;
  } catch (error) {
    console.error(error);
    el.hidden = true;
  }
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-images]');
  if (root) mountGallery(root);
}
