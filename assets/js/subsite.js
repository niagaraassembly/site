/* Subsite pages: type filters, and margin items in the right-hand margin.
 *
 * The side navigation is positioned in CSS, the same way the Apps panel uses
 * the margin beside the frame. Margin items stay in the article until the
 * viewport is wide enough, then this script pins each one to the right of
 * the frame at the paragraph it belongs to. On a narrow screen they stay
 * inline. If this file fails to run, the notes remain in the article.
 */

export function selectedType(search) {
  return new URLSearchParams(search).get('type') || '';
}

export function pieceVisible(pieceType, selected) {
  return selected === '' || pieceType === selected;
}

function applyTypeFilter() {
  const selected = selectedType(location.search);
  document.querySelectorAll('[data-type-filter]').forEach((link) => {
    if (link.getAttribute('data-type-filter') === selected) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
  const items = [...document.querySelectorAll('[data-piece-type]')];
  let shown = 0;
  for (const item of items) {
    const on = pieceVisible(item.getAttribute('data-piece-type'), selected);
    item.hidden = !on;
    if (on) shown += 1;
  }
  document.querySelectorAll('[data-piece-empty]').forEach((empty) => {
    empty.hidden = items.length === 0 || shown !== 0;
  });
}

function applySubsiteContext() {
  const navs = [...document.querySelectorAll('.subsite-nav[data-subsite]')];
  if (navs.length < 2) return;
  const want = new URLSearchParams(location.search).get('site');
  const match = navs.find((nav) => nav.dataset.subsite === want) || navs[0];
  for (const nav of navs) nav.hidden = nav !== match;
}

function placeMargins() {
  const frame = document.querySelector('.frame');
  const items = [...document.querySelectorAll('.margin-item')];
  for (const item of items) {
    item.classList.remove('margin-item--side');
    item.style.top = '';
  }
  const wide = window.matchMedia('(min-width: 69rem)').matches;
  if (!wide || !frame || items.length === 0) return;

  const frameTop = frame.getBoundingClientRect().top + window.scrollY;
  const naturals = items.map((item) => item.getBoundingClientRect().top + window.scrollY - frameTop);
  for (const item of items) item.classList.add('margin-item--side');

  const panel = document.querySelector('.appspanel--side');
  let floor = 0;
  if (panel) {
    const rect = panel.getBoundingClientRect();
    floor = rect.bottom + window.scrollY - frameTop + 16;
  }
  let cursor = 0;
  items.forEach((item, index) => {
    let top = Math.max(naturals[index], cursor);
    if (top < floor && naturals[index] < floor) top = Math.max(top, floor);
    item.style.top = `${top}px`;
    cursor = top + item.offsetHeight + 12;
  });
}

function start() {
  applyTypeFilter();
  applySubsiteContext();
  const run = () => requestAnimationFrame(placeMargins);
  run();
  window.addEventListener('load', run);
  window.addEventListener('resize', run);
  window.matchMedia('(min-width: 69rem)').addEventListener('change', run);
}

if (typeof document !== 'undefined') start();
