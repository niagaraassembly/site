# Content tracking

Provisional. The folder name `content/posts/` and this layout are a holding area. The owner will reshape them.

Nothing in this folder is published. Publication still waits on Morgen.

## Files

| Path | What it holds |
|---|---|
| `ideas.csv` | Ideas. `status` is `idea`, `approved`, `rejected`, or `written`. |
| `created.csv` | Items that have a file. `status` is `draft`, `ready`, or `published`. |
| `index.csv` | The same drafted or published items, with `file_path` and `published_url`. |
| `items/` | The item files. |

## IDs

One scheme: `HM-` plus four digits (`HM-0001`).

The same id is `idea_id` in `ideas.csv`, `content_id` and `idea_id` in `created.csv`, `content_id` in `index.csv`, and `content_id` in the item's front matter. A written item keeps the idea's id. It does not get a second number.

`published_url` stays blank until a piece is actually on the public site.

## Build

`node scripts/subsite/build.mjs` does not read `content/posts/items/`. It reads `content/pieces/` only. These drafts therefore do not appear under `site/` or `pieces/`.

Each item uses the same front matter as `content/templates/`, plus two optional fields the piece checker accepts:

- `content_id` — `HM-0001` form
- `author_kind` — `agent` or `human`

The piece front-matter reader accepts an underscore in a key name so those two fields parse. `town:buffalo` still stays one string, because there is no space after that colon.

`post` and `article` stay reserved for human-written work. These five items are `explainer` or `summary`, `author_kind: agent`, and `status: draft`.

A later move into `content/pieces/` can keep that front matter. `status: draft` is still withheld from the public HTML. Copying a file does not publish it. Greater Niagara and HeavyMap navigation are unchanged.
