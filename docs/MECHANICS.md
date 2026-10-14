# Site mechanics

Where each moving part of niagaraassembly.com lives, what feeds it, and what
to run after changing it. Start here before editing the site. Linked from
`CLAUDE.md`, so every agent session sees it.

The look (tokens, widths, type, frames) is in
[`design-system.md`](design-system.md). Working rules (raw logging,
jurisdiction, evidence) are in [`../CLAUDE.md`](../CLAUDE.md). Backlog and
history of website work: Linear project **Website** (team `niagaraassembly`).

## Run and test

```bash
python3 -m http.server 8080          # preview; any static server works
node --test tests/*.test.mjs         # 8 Board tests were already failing on 2026-10-13; see atlas/logs
node scripts/images/build.mjs        # after adding/changing an article image or a credits file
node scripts/reader/build.mjs        # after adding an issue, article, research post or desk issue
```

`tests/images.test.mjs` and `tests/reader.test.mjs` fail when the two
generated files are stale, so a forgotten rebuild shows up in the test run.

## Generated data (never edit by hand)

| File | Built by | From |
|---|---|---|
| `data/images.json` | `scripts/images/build.mjs` | every `<img>` inside `.article` under `MAGS/<MAG>/…` (figcaption = credit), plus `assets/img/home/credits.json` and `assets/img/desks/credits.json` |
| `data/reader.json` | `scripts/reader/build.mjs` | START issue lists (editor's order, `.mag-date` for date and read time), `data/research.json` posts, `data/desks.json` issues |

## Hand-maintained registries

| File | Holds | Read by |
|---|---|---|
| `assets/js/sitenav.js` `NAV` | the one site menu | every page header; `tests/sitenav.test.mjs` checks each path exists |
| `data/desks.json` | regional desks, their states/countries and issues (title, href, date, data file) | desk flag menus and issue picker (`deskflags.js`), Records, Reader build |
| `data/research.json` | Research places and posts | Research lists (`research.js`), Reader build |
| `assets/img/home/credits.json`, `assets/img/desks/credits.json` | non-article images with author and licence | image index build |

## Features

| Feature | Files | Notes |
|---|---|---|
| Header | `sitenav.js`, `site.css` | Wordmark menus; **Records** link; social icons; theme toggle; **Reader** icon. Also listens for any `[data-reader-open]` click and loads the Reader on demand. |
| Reader | `reader.js`, `reader.css` (loaded on first open), `data/reader.json` | `data-reader-open="<url>"` on any element opens that piece; empty value continues reading. Read state in `localStorage["na-reader"]`, this device only. Desk issues open as a write-up from their frozen edition data. |
| Records | `records/`, `records.js` (rules), `records-page.js` (page), `records.css`, fonts in `assets/fonts/` (IBM Plex) | Same code serves `/records/` and each desk's `investments/` page (`data-record-region` locks region and type). Filters live in the URL. `/desks/records/` redirects here. |
| Desk issue picker | `deskflags.js` `renderIssueMenu`, `desk-publication.css` `.issue-menu` | Byline "Issue One" is a `<details>` menu filled from `data/desks.json`. `wny.js` writes only `.issue-byline__rest`. |
| Image index | `images/`, `images.js`, `images.css`, `data/images.json` | `/credits/` and `/desks/credits/` redirect here. `mountStrip(el, { magazine })` puts a thumbnail row on a magazine landing. Wikimedia thumbnails use 500px (only some widths are served). |
| Board posting form | `board-form.js` | One form for the homepage `#post` and the Board page's "Post to the Board" bar (`/board/#post`). Field ids for the Google Form are in this file. |
| Magazine landings | `MAGS/START/index.html` + `start.css`; `MAGS/RESEARCH/index.html` + `research.css` | Written as templates: masthead, current issue/table of contents or study dossier, journey/method, image strip, archive. |
| Homepage blocks | `index.html`, `home.css`, `home-blocks.css`, `assets/img/home/` | Desks, Tools, Magazines, Services with the NA* band, Places. |

## Copy archive

Text drafted by agents, and alternatives not chosen, is saved under
[`copy/`](../copy/README.md), one folder per page or area
(`copy/frontpage/`, `copy/places/`, `copy/services/na/`, …). The live HTML
is the authority; the archive is the trail.

## Redirects

Static redirect pages (meta refresh + `location.replace`, query and hash
kept where it matters): `MAGS/WNY/**` → `desks/us/ny/western-new-york/**`,
`desks/records/` → `records/`, `credits/` and `desks/credits/` → `images/`.
