# Fonts

Self-hosted so the site makes no third-party requests, and so the hand
face renders identically on every device. Licence checked by reading the
`name` table out of the font binary itself (IDs 0/13/14), not by trusting
the page it was downloaded from.

| File | Face | Licence | Source |
|---|---|---|---|
| `comic-neue-latin-400-normal.woff2` | Comic Neue 400 | SIL OFL 1.1 — © 2014 The Comic Neue Project Authors | `@fontsource/comic-neue@5` |
| `comic-neue-latin-700-normal.woff2` | Comic Neue 700 | SIL OFL 1.1 — same | `@fontsource/comic-neue@5` |

Latin subset only.

## Why this is self-hosted rather than a font stack

`--hand` used to be a stack headed by `Comic Sans MS`, falling back through
`Segoe Print` and `Bradley Hand` to `cursive`. That produced a different
face on nearly every platform:

- **Windows** — Comic Sans MS. The intended look.
- **macOS** — no Comic Sans unless Office is installed, so `Bradley Hand`:
  a genuine handwriting face, much more slanted and irregular.
- **iOS** — `Bradley Hand`, same problem.
- **Android** — neither exists, so generic `cursive`, which Android maps to
  a script face like Dancing Script. Barely legible at label sizes.
- **Linux** — usually nothing until generic `cursive`.

A font stack cannot fix this, because the fix requires a font that is
actually present. Comic Neue is the openly-licensed face designed as a
Comic Sans replacement, so shipping it makes every platform agree.
