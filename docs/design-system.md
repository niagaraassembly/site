# Design system

How niagaraassembly.com looks and why. This page names the tokens and
classes; their values live in the stylesheets, which are the authority. If a
value here ever disagrees with the CSS, the CSS is right and this page is
stale.

| File | Holds |
|---|---|
| `assets/css/site.css` | Tokens, the frame, navigation, footer, forms, tables, margins, mobile |
| `assets/css/home.css` | The homepage only |
| `assets/css/mag.css` | Magazines: issue fronts, cards, money, county band, sign-up, sources |
| `assets/js/sketch.js` | The hand-drawn (Rough.js) frame and boxes |
| `assets/js/margin.js` | When side blocks move into the margins |
| `assets/js/sitenav.js` | The one site menu and header icons, rendered into every page |

## Principles

1. **A plain document with one drawn box around it.** Ink on paper, one
   left-aligned column, very little decoration. The Rough.js frame carries
   the character; everything else is restraint.
2. **Open with something to look at.** A page's persistent idea is an
   engaging image or map at its top: the homepage's corridor map, a
   magazine's county band and locator, a place's map. Prefer this to
   decorative headers.
3. **Pages degrade to plain HTML.** Every border has a CSS fallback that
   `sketch.js` removes only after drawing (`.sketched`). Margin notes stay in
   the article if the script fails. Data pages show a plain message if their
   JSON fails to load.
4. **Show only what is approved, and show gaps as gaps.** See `CLAUDE.md`
   for the evidence rules; design never fills a gap with a placeholder that
   reads as fact.

## Page widths

There are three widths, widest first. Each grows with the screen between a
floor and a cap. A bigger screen gets a little more page and much more
margin. Below the floor the page fills the screen inside the body's side
padding (`--gutter`, which also scales with the screen).

| Token | Used for | 1024px screen | 1280px | 1440px | 1920px |
|---|---|---|---|---|---|
| `--w-home` | the homepage | fills | 1152 | 1152 | 1152 |
| `--w-mag` | magazine fronts, issues, their listings and sources, the board | 883 | 960 | 1008 | 1024 |
| `--w-page` | menu pages (Services, Goods, Places, Company...) and articles | 736 | 800 | 832 | 832 |

Figures are in CSS pixels as measured on 2026-10-11. The formulas are in
`site.css` `:root`.

**How a page picks its width:**

- `--measure` and `--board` are the names most rules use. They point at
  `--w-page` and `--w-mag`.
- A plain `.frame` is page width.
- `.frame.frame--mag` is magazine width. `.frame--board` is the same width,
  kept for the board.
- The homepage sets `--measure` to `--w-home` on `body.home-page`.
- The header (`.topnav`) and footer (`.sitefoot`) follow the frame by
  themselves (`body:has(.frame--mag)`), so a page doesn't need to change its
  header class.

**Which width?**

- **Page:** anything reached from the main menu that is a page to read. This
  includes articles and posts inside a magazine (for example START's issue
  articles, or a Research place).
- **Magazine:** a magazine's front, an issue, or a listing of its items.
- **Home:** the homepage only.

## Margins

The page width is the narrowest on purpose: its side margins are space for
notes and engagement blocks beside the text.

- On a wide screen these move into the margins:
  - **margin notes** (`.margin-item` becomes `.margin-item--side`, placed by
    `subsite.js`, which keeps each note level with its paragraph)
  - a subsite's **section nav** (`.subsite-nav`)
- The rule is one number: a block goes into the margin when at least
  **12rem** is free on each side of the frame, measured from the frame as
  drawn (`assets/js/margin.js`). On a page-width frame that happens at a
  72rem (1152px) screen. The `.subsite-nav` media query in `site.css` uses
  the same figure; change both together.
- Below that width, notes sit in the text, and the section nav stacks above
  the article.
- A side block's width is `min(14.5rem, the margin less 3.5rem)`.

New kinds of margin block should reuse `.margin-item` and `frameHasMargin()`
rather than adding another breakpoint.

## Colour

Light is the default. Dark is opt-in via the toggle (`data-theme="dark"` on
`<html>`), never `prefers-color-scheme`, because the look was designed on
paper. Every colour token has a dark mirror next to it in the CSS.

**Base, in `site.css`:**

| Token | Role |
|---|---|
| `--paper` | the page around the frame (grey) |
| `--sheet` | inside the frame, a little whiter than the page; every frame uses it |
| `--ink`, `--ink-soft` | text and lines; secondary text |
| `--rule` | hairlines and quiet borders |
| `--field` | form fields |

**Magazine colours, in `mag.css`:** each has a light and a dark value.

| Tokens | Meaning |
|---|---|
| `--amount-done`, `--amount-announced` | money by stage: completed (green), announced (yellow); in development is drawn hollow |
| `--flag-warn`, `--flag-info` | story flags |
| `--county-news`, `--county-quiet` | the county band: counties with and without news this issue |
| `--tint-wny`, `--tint-ontario`, `--tint-na` | sign-up choice tints by region |
| `--region-red` | the region on the state locator |

The homepage adds `--lake-wash` for lakes on the corridor map.

## Type

| Token | Face | Use |
|---|---|---|
| `--sans` | system sans | all prose and headings |
| `--hand` | Comic Neue (self-hosted, `font-display: block`) | interactive chrome only: menu words, buttons, map labels, hand-drawn bits |
| `--mono` | system mono | dates, kickers, small data labels |

- Prose paragraphs are capped at 40rem.
- Card prose in magazines is capped the same way. A card's top row (stage,
  amount) spans the card.

## Frames and boxes

- `.frame` with `data-sketch="frame"` is the one drawn box on a page.
  - Padding is 3rem / 2.5rem, or 2rem on magazine width.
  - On phones it shrinks to about a third.
- Other `data-sketch` values draw smaller boxes in the same hand.
- After layout changes, call `window.NASketch.redraw()` so the lines follow.

## Magazine pieces (`mag.css`)

These are built for the Western New York magazine and meant for reuse by
other regional magazines:

- **Title line:** the kicker, the magazine title, then the issue line (issue,
  date, coverage window) with "Print or save as PDF" at the right. Flags and
  the state locator sit at the top right.
- **County band:** one tile per county, hatched by stage colour, with a news
  count.
- **Ticker:** one headline at a time, with a Pause control.
- **Corridor line and money cells:** the region equation, which sums
  production investment and committed money only. See
  `research/methods/news/` for the money rules.
- **Cards:** stage and amount, headline, facts (jobs, public support, next
  step, districts, stage), flags, conflicts, sources, and a copy-link
  control.
- **By district, sign-up, sources:** each with keyword search and filters
  where the list is long.

## Homepage

The homepage has its own pieces in `home.css`:

- the corridor map, with a toggle to the detailed regional sketch
  (`sketches/region/`)
- uppercase section headings with a "↗" link
- magazine cards
- the services grid
- the Electronics band

The uppercase headings belong to the homepage. They are not a site-wide
pattern unless that is decided later.

## Starting a new page

Copy an existing page of the same width. The skeleton is:

```html
<header class="topnav" data-sitenav></header>
<div class="frame" data-sketch="frame">          <!-- add frame--mag for a magazine page -->
  ...
</div>
<footer class="sitefoot">...</footer>           <!-- copied as-is: name, email, icons -->
```

- **The `<head>`:** it carries the inline theme script (so a dark-mode
  visitor gets no flash of the light page), `site.css`, and the three
  favicon links. Pages generated by `scripts/subsite/render.mjs` get these
  from its template.
- **The menu:** add the page to `NAV` in `sitenav.js`.
  `tests/sitenav.test.mjs` checks every menu path has a page with the plain
  shared header.

## Header

- The header (`sitenav.js`) holds:
  - on the left: the logo (house on inner pages) and the "Niagara Assembly
    Inc." wordmark, whose words open the menus
  - on the right: the GitHub, X, LinkedIn and Discord icons and the theme
    toggle
- The List, Updates and Apps links were removed on 2026-10-11.
- The left side sits 1rem inside the frame's line, closer than the content.
  The right side keeps the content's inset (`--content-inset`).
