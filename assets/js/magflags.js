/* MAG flag menus and state pages.
 *
 * data/mags.json lists every regional MAG with its state. A MAG page's
 * country flag opens a menu of states that have a MAG; its state flag opens
 * a menu of that state's MAGs. /mags/states/<slug>/ lists a state's MAGs
 * from the same file, so a new MAG is added in one place.
 *
 * The menus are <details> elements: they open and close without script;
 * this file only fills them and closes an open one on an outside click or
 * Escape.
 */

import { escapeHtml } from './escape.js';

const local = (href) => (/^\/(?!\/)/.test(String(href ?? '')) ? String(href) : '#');

/** States with at least one MAG, by name, for a country. */
export function statesWithMags(registry, country = 'US') {
  const used = new Set((registry.mags ?? []).map((m) => m.state));
  return Object.entries(registry.states ?? {})
    .filter(([slug, s]) => used.has(slug) && s.country === country)
    .map(([slug, s]) => ({ slug, ...s }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A state's MAGs, by name. */
export function magsInState(registry, slug) {
  return (registry.mags ?? []).filter((m) => m.state === slug).sort((a, b) => a.name.localeCompare(b.name));
}

export function renderStateMenu(registry, country) {
  return statesWithMags(registry, country).map((s) =>
    `<li><a href="${escapeHtml(local(s.href))}">${escapeHtml(s.name)}</a></li>`).join('');
}

export function renderMagMenu(registry, slug) {
  return magsInState(registry, slug).map((m) =>
    `<li><a href="${escapeHtml(local(m.href))}">${escapeHtml(m.name)}</a></li>`).join('');
}

export function renderStateMags(registry, slug) {
  return magsInState(registry, slug).map((m) =>
    `<li class="issue-list__item"><a class="issue-list__title" href="${escapeHtml(local(m.href))}">${escapeHtml(m.name)}</a>`
    + (m.summary ? `<p class="issue-list__meta">${escapeHtml(m.summary)}</p>` : '') + '</li>').join('');
}

async function loadRegistry() {
  const res = await fetch('/data/mags.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function mountMagFlags(root = document) {
  const menus = [...root.querySelectorAll('[data-flag-menu]')];
  const lists = [...root.querySelectorAll('[data-state-mags]')];
  if (!menus.length && !lists.length) return;
  let registry;
  try {
    registry = await loadRegistry();
  } catch (err) {
    console.error('mags.json failed to load', err);
    for (const list of lists) list.innerHTML = '<li class="issue-list__item"><p class="issue-list__meta">The list of MAGs didn’t load. Reload the page to try again.</p></li>';
    return;
  }
  for (const menu of menus) {
    const list = menu.querySelector('ul');
    const items = menu.dataset.flagMenu === 'country'
      ? renderStateMenu(registry, menu.dataset.country)
      : renderMagMenu(registry, menu.dataset.state);
    list.innerHTML = items || '<li class="mag-flag__none">None yet</li>';
  }
  for (const list of lists) {
    list.innerHTML = renderStateMags(registry, list.dataset.stateMags);
  }
  /* One menu open at a time; an outside click or Escape closes it. */
  document.addEventListener('click', (e) => {
    for (const menu of menus) if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const menu of menus) {
      if (menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    }
  });
  for (const menu of menus) {
    menu.addEventListener('toggle', () => {
      if (menu.open) for (const other of menus) if (other !== menu) other.open = false;
    });
  }
}

if (typeof document !== 'undefined') mountMagFlags();
