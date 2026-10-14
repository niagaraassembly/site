/* desk flag menus and state pages.
 *
 * data/desks.json lists every regional desk with its state. A desk page's
 * country flag opens a menu of states that have a desk; its state flag opens
 * a menu of that state's desks. /desks/<country>/<subdivision>/ lists a state's desks
 * from the same file, so a new desk is added in one place.
 *
 * The menus are <details> elements: they open and close without script;
 * this file only fills them and closes an open one on an outside click or
 * Escape.
 */

import { escapeHtml } from './escape.js';

const local = (href) => (/^\/(?!\/)/.test(String(href ?? '')) ? String(href) : '#');

/** States with at least one desk, by name, for a country. */
export function statesWithDesks(registry, country = 'US') {
  const used = new Set((registry.desks ?? []).map((m) => m.state));
  return Object.entries(registry.states ?? {})
    .filter(([slug, s]) => used.has(slug) && s.country === country)
    .map(([slug, s]) => ({ slug, ...s }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A state's desks, by name. */
export function desksInState(registry, slug) {
  return (registry.desks ?? []).filter((m) => m.state === slug).sort((a, b) => a.name.localeCompare(b.name));
}

export function renderStateMenu(registry, country) {
  return statesWithDesks(registry, country).map((s) =>
    `<li><a href="${escapeHtml(local(s.href))}">${escapeHtml(s.name)}</a></li>`).join('');
}

export function renderDeskMenu(registry, slug) {
  return desksInState(registry, slug).map((m) =>
    `<li><a href="${escapeHtml(local(m.href))}">${escapeHtml(m.name)}</a></li>`).join('');
}

export function renderStateDesks(registry, slug) {
  return desksInState(registry, slug).map((m) =>
    `<li class="issue-list__item"><a class="issue-list__title" href="${escapeHtml(local(m.href))}">${escapeHtml(m.name)}</a>`
    + (m.summary ? `<p class="issue-list__meta">${escapeHtml(m.summary)}</p>` : '') + '</li>').join('');
}

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dated = (iso) => (iso ? DATE.format(new Date(`${iso}T00:00:00Z`)) : '');

/** A desk's issue menu: newest first, the page's own issue marked current,
 *  then the desk's running lists. */
export function renderIssueMenu(registry, deskId, currentHref) {
  const desk = (registry.desks ?? []).find((m) => m.id === deskId);
  if (!desk) return '';
  const issues = [...(desk.issues ?? [])].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const items = issues.map((i) => {
    const current = i.href === currentHref ? ' aria-current="page"' : '';
    return `<li><a href="${escapeHtml(local(i.href))}"${current}><span>${escapeHtml(i.title)}</span>`
      + (i.date ? ` <span class="issue-menu__date">${escapeHtml(dated(i.date))}</span>` : '') + '</a></li>';
  });
  const base = local(desk.href);
  items.push(`<li class="issue-menu__more"><a href="${escapeHtml(base === '#' ? '#' : `${base}posts/`)}">All articles</a></li>`);
  return items.join('');
}

async function loadRegistry() {
  const res = await fetch('/data/desks.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function mountDeskFlags(root = document) {
  const flags = [...root.querySelectorAll('[data-flag-menu]')];
  const issueMenus = [...root.querySelectorAll('[data-issue-menu]')];
  const menus = [...flags, ...issueMenus];
  const lists = [...root.querySelectorAll('[data-state-desks]')];
  if (!menus.length && !lists.length) return;
  let registry;
  try {
    registry = await loadRegistry();
  } catch (err) {
    console.error('desks.json failed to load', err);
    for (const list of lists) list.innerHTML = '<li class="issue-list__item"><p class="issue-list__meta">The list of desks didn’t load. Reload the page to try again.</p></li>';
    return;
  }
  for (const menu of issueMenus) {
    /* The page ships its own issue in the list, so the menu still works if
       this never runs; the registry adds the rest. */
    const items = renderIssueMenu(registry, menu.dataset.issueMenu, menu.dataset.current);
    if (items) menu.querySelector('ul').innerHTML = items;
  }
  for (const menu of flags) {
    const list = menu.querySelector('ul');
    const items = menu.dataset.flagMenu === 'country'
      ? renderStateMenu(registry, menu.dataset.country)
      : renderDeskMenu(registry, menu.dataset.state);
    list.innerHTML = items || '<li class="mag-flag__none">None yet</li>';
  }
  for (const list of lists) {
    list.innerHTML = renderStateDesks(registry, list.dataset.stateDesks);
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

if (typeof document !== 'undefined') mountDeskFlags();
