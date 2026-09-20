/* The site's drill-down navigation: one tree, rendered into every page.
 *
 * Every page carries an empty <header class="topnav" data-sitenav> and this
 * module fills it, so there is exactly one place a menu item is added or
 * renamed. tests/sitenav.test.mjs checks each path below has a page on disk.
 *
 * Behaviour: the three words of the wordmark are the only in-place toggles.
 * Everything beneath them is an ordinary link; the destination page opens
 * with its own ancestry expanded and underlined, so the menu is a pure
 * function of the URL. That is also why the wordmark's "open" state needs
 * no storage.
 *
 * Not to be confused with assets/js/nav.js, which is the board's category
 * schema.
 */

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const leaf = (base, label) => ({ label, path: `${base}${slug(label)}/` });
const node = (base, label, kids) => {
  const path = `${base}${slug(label)}/`;
  return { label, path, items: kids.map((k) => leaf(path, k)) };
};

export const NAV = [
  { word: 'Niagara', caps: true, items: [
    { label: 'Services', path: '/services/', items: [
      node('/services/', 'Spaces',   ['Work', 'Office', 'Event', 'Digital', 'Retail', 'Storage']),
      node('/services/', 'Training', ['Clark', 'Electronics', 'Manufacturing', 'Linux']),
      node('/services/', 'Events',   ['Meetups', 'Talks', 'Tours', 'Workshops', 'Launches', 'Demos']),
      node('/services/', 'Tools',    ['Board', 'HeavyMap', 'Environments', 'Gage']),
      node('/services/', 'News',     ['Sector', 'Solo']),
      node('/services/', 'Grow',     ['Local', 'Site', 'Building', 'Market', 'Product']),
      node('/services/', 'NA*',      ['Interviews', 'Profiles', 'Edits'])
    ] },
    node('/', 'Goods',  ['Retail']),
    node('/', 'Places', ['Hamilton'])
  ] },
  { word: 'Assembly', items: [
    node('/assembly/', 'Membership',
         ['Founding', 'Bench', 'Shop', 'Keyholder', 'Cheerleader', 'Corporate']),
    leaf('/assembly/', 'Sponsorship'),
    leaf('/assembly/', 'Partnership'),
    leaf('/assembly/', 'Investment')
  ] },
  { word: 'Inc.', items: [
    leaf('/inc/', 'Status'),
    /* Purpose is the existing company page; its URL predates the menu. */
    { label: 'Purpose', path: '/company/' },
    leaf('/inc/', 'Networks'),
    leaf('/inc/', 'Operations'),
    leaf('/inc/', 'Finances'),
    leaf('/inc/', 'Stats')
  ] }
];

/* Pages that live outside the menu's URL scheme but belong to a node. The
   board is a full application at /board/; the menu's Tools > Board entry is
   a landing page that links to it, and the board itself should still show
   that trail. */
const ALIASES = { '/board/': '/services/tools/board/' };

const HOME = '/';

const normalise = (pathname) => {
  let p = pathname.replace(/index\.html$/, '');
  if (!p.endsWith('/')) p += '/';
  return ALIASES[p] ?? p;
};

/* The ancestry of a URL: which wordmark word owns it and the chain of items
   from that word's first level down to the page itself. null when the page
   is not in the menu (the home page, Call for Infrastructures). */
export function trailFor(pathname) {
  const target = normalise(pathname);
  const walk = (items, chain) => {
    for (const item of items) {
      const here = [...chain, item];
      if (item.path === target) return here;
      const found = item.items && walk(item.items, here);
      if (found) return found;
    }
    return null;
  };
  for (let word = 0; word < NAV.length; word++) {
    const chain = walk(NAV[word].items, []);
    if (chain) return { word, chain };
  }
  return null;
}

/* Every menu path, for the on-disk test. */
export function allPaths() {
  const out = [];
  const walk = (items) => items.forEach((i) => { out.push(i.path); if (i.items) walk(i.items); });
  NAV.forEach((w) => walk(w.items));
  return out;
}

/* The rows to show for an open word. `sel` is the chain of expanded items,
   one per depth. Each row lists the items at that depth and which of them
   (if any) is expanded; the next row is that item's children. */
export function rowsFor(word, sel) {
  const rows = [];
  let items = NAV[word].items;
  for (let depth = 0; items; depth++) {
    const active = items.find((i) => i === sel[depth]) ?? null;
    rows.push({ items, active, depth });
    items = active && active.items;
  }
  return rows;
}

/* Clicking an item that has children expands it, or collapses it if it is
   already open; either way anything deeper is dropped. */
export function toggle(sel, depth, item) {
  return sel[depth] === item ? sel.slice(0, depth) : [...sel.slice(0, depth), item];
}

/* ---- rendering (browser only) ------------------------------------------- */

const ICONS = {
  github: '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M17.5 3h3.1l-6.8 7.7L21.8 21h-6.2l-4.9-6.4L5.1 21H2l7.2-8.2L2.4 3h6.3l4.4 5.8L17.5 3Zm-1.1 16.1h1.7L7.7 4.8H5.9l10.5 14.3Z"/></svg>',
  discord: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M19.54 0c1.13 2.01 1.94 4.2 2.31 6.51a16.8 16.8 0 0 0-4.05-1.23c-.17-.03-.34.05-.43.2-.18.31-.38.64-.55.96a15.4 15.4 0 0 0-9.64 0c-.17-.32-.37-.65-.55-.96a.5.5 0 0 0-.43-.2C4.98 5.29 3.62 5.7 2.15 6.51A22.8 22.8 0 0 0 .46 19.04c1.93 1.43 3.8 2.3 5.64 2.87.14.04.3-.01.39-.13.43-.59.82-1.21 1.15-1.86.07-.14.01-.31-.13-.36a14.2 14.2 0 0 1-1.76-.84c-.17-.09-.18-.33-.02-.43.12-.08.25-.16.37-.24.08-.05.18-.06.27-.02 5.8 2.65 12.07 2.65 17.8 0 .09-.04.19-.03.27.02.12.08.25.16.37.24.16.1.15.34-.02.43-.56.31-1.15.59-1.76.84-.14.06-.2.22-.13.36.34.65.72 1.27 1.15 1.86.09.12.25.17.39.13 1.85-.57 3.72-1.44 5.64-2.87A22.8 22.8 0 0 0 19.54 0ZM8.03 15.22c-1.13 0-2.06-1.04-2.06-2.32s.91-2.32 2.06-2.32 2.08 1.04 2.06 2.32c0 1.28-.91 2.32-2.06 2.32Zm7.94 0c-1.13 0-2.06-1.04-2.06-2.32s.91-2.32 2.06-2.32 2.08 1.04 2.06 2.32c0 1.28-.91 2.32-2.06 2.32Z"/></svg>',
  /* Roof-and-body as one closed shape so the fill (a faint ink tint, set in
     CSS) stays inside the outline; the door is stroke only. */
  house: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="house__body" d="M12 3.2 2.6 11.4h2.9v8.6h13v-8.6h2.9Z"/><path class="house__door" d="M10 20v-5.2h4V20"/></svg>'
};

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

function iconLink(href, label, svg) {
  return el('a', { class: 'topnav__icon', href, rel: 'noopener', 'aria-label': label, html: svg });
}

function build(header) {
  const pathname = location.pathname;
  const isHome = normalise(pathname) === HOME;
  const trail = trailFor(pathname);
  let open = trail ? trail.word : null;
  /* Starts as the current page's ancestry; clicks then change it in place. */
  let sel = trail ? trail.chain : [];
  const current = normalise(pathname);

  const logo = el('a', {
    class: isHome ? 'topnav__logo' : 'topnav__logo topnav__logo--house',
    href: '/',
    'aria-label': isHome ? 'Niagara Assembly' : 'Niagara Assembly home',
    html: isHome
      ? '<img src="/assets/img/logo.jpg" alt="" width="34" height="34">'
      : ICONS.house
  });

  const words = el('div', { class: 'topnav__words' });
  const buttons = NAV.map((w, i) => {
    const b = el('button', { type: 'button', class: 'topnav__word', 'aria-expanded': 'false' }, w.word);
    b.addEventListener('click', () => {
      open = open === i ? null : i;
      /* Another word starts from its own page's trail, or from nothing. */
      sel = trail && trail.word === open ? trail.chain : [];
      sync();
    });
    words.append(b);
    return b;
  });

  /* Two groups so small screens can pull the text links onto their own line
     (beside the hint) while the icons and theme toggle stay with the title. */
  const links = el('nav', { class: 'topnav__links', 'aria-label': 'Site links' },
    el('span', { class: 'topnav__text' },
      el('a', { href: '/#join' }, 'List'),
      el('a', { href: 'https://updates.niagaraassembly.com' }, 'Updates')),
    el('span', { class: 'topnav__social' },
      iconLink('https://github.com/niagaraassembly', 'Niagara Assembly on GitHub', ICONS.github),
      iconLink('https://x.com/niagaraassembly', 'Niagara Assembly on X', ICONS.x),
      iconLink('https://discord.gg/kxacHHRmBC', 'Niagara Assembly on Discord', ICONS.discord),
      el('button', { type: 'button', class: 'themetoggle', 'data-theme-toggle': '',
                     'aria-label': 'Switch between light and dark' })));

  const rows = el('div', { class: 'topnav__rows', id: 'topnav-rows' });
  const hint = el('p', { class: 'topnav__hint' }, 'Click above for menus');

  /* Rows sit in normal flow, so each one pushes the page content down.
     Items with children are buttons that expand in place; only leaf items
     are links, so nothing navigates until a page is actually chosen. */
  function renderRows() {
    rows.replaceChildren();
    if (open === null) return;
    for (const { items, active, depth } of rowsFor(open, sel)) {
      const row = el('div', { class: 'topnav__row' });
      if (depth === 0 && NAV[open].caps) row.dataset.caps = '';
      /* Last-tier rows are set in the hand face, as the storyboard has them. */
      if (depth > 0 && items.every((i) => !i.items)) row.dataset.tier = 'leaf';
      for (const item of items) {
        let node;
        if (item.items) {
          node = el('button', { type: 'button', 'aria-expanded': String(item === active),
                                'data-path': item.path }, item.label);
          node.addEventListener('click', () => {
            sel = toggle(sel, depth, item);
            sync();
            rows.querySelector(`[data-path="${item.path}"]`)?.focus();
          });
        } else {
          node = el('a', { href: item.path }, item.label);
          if (item.path === current) node.setAttribute('aria-current', 'page');
        }
        if (item === active || item.path === current) node.classList.add('is-active');
        row.append(node);
      }
      rows.append(row);
    }
  }

  function sync() {
    buttons.forEach((b, i) => b.setAttribute('aria-expanded', String(open === i)));
    renderRows();
    hint.hidden = !(isHome && open === null);
  }

  header.replaceChildren(el('div', { class: 'topnav__bar' }, logo, el('div', { class: 'topnav__main' }, words, links)), rows, hint);
  sync();
}

if (typeof document !== 'undefined') {
  const header = document.querySelector('[data-sitenav]');
  if (header) build(header);
}
