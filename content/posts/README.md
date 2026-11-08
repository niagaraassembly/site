# Content tracking

Provisional. The folder name `content/posts/` and this layout are a holding area. The owner will reshape them.

Nothing in this folder is published until its status is changed as below. Publication still waits on Morgen.

## Files

| Path | What it holds |
|---|---|
| `ideas.csv` | Ideas. `status` is `idea`, `approved`, `rejected`, or `written`. |
| `created.csv` | Items that have a file. `status` is `draft` or `published`, matching the file. |
| `index.csv` | The same items, with `file_path`, `status`, and `published_url`. |
| `items/` | The item files. This is the piece. The build reads these files. It does not copy them into `content/pieces/`. |

## IDs

One scheme: `HM-` plus four digits (`HM-0001`).

The same id is `idea_id` in `ideas.csv`, `content_id` and `idea_id` in `created.csv`, `content_id` in `index.csv`, and `content_id` in the item's front matter. A written item keeps the idea's id. It does not get a second number.

## What the build does

`node scripts/subsite/build.mjs` loads `content/pieces/*.md` and `content/posts/items/*.md`. One slug cannot be used in both places.

The publication gate is `status` in the front matter. `draft` is checked, then withheld: no HTML is written, so the address 404s. `published` is written to `/pieces/<slug>/` and listed on each subsite whose region contains the piece's places.

`created.csv` and `index.csv` must match that status and the file path. If they do not, the build stops. `ideas.csv` stays `written` for an item that already has a file. It is not a second publication switch.

`published_url` and `published_date` stay blank while the item is a draft. On publication, `published_url` is `/pieces/<slug>/` and `published_date` is `YYYY-MM-DD`.

## Landing lists

On HeavyMap and Greater Niagara, the landing page has three lists. Navigation is unchanged.

| List | What it shows |
|---|---|
| Latest updates | Published pieces with `type: update`, newest `updated` first. |
| Recent | Every published piece for that subsite, newest `date` first. |
| Featured | Published pieces with `featured: true` only. |

An empty list is one sentence. The build does not insert a sample piece. A draft does not appear in any of the three.

## Approve one item

Example: publish HM-0001, Claim and refusal contract. Do all of these, then rebuild. Doing only one of them makes the build fail, and the page stays absent.

1. In `content/posts/items/hm-0001-claim-refusal-contract.md`, set `status: published`. Leave `author_kind: agent`. Set `featured: true` only if the piece should also appear under Featured. Leave `featured` unset if it should appear only under Recent.
2. In `created.csv`, on the HM-0001 row, set `status` to `published` and `published_date` to the publication date (`YYYY-MM-DD`).
3. In `index.csv`, on the HM-0001 row, set `status` to `published` and `published_url` to `/pieces/hm-0001-claim-refusal-contract/`.
4. Leave `ideas.csv` at `written`.
5. Run `node scripts/subsite/build.mjs`.

After that, the page is `/pieces/hm-0001-claim-refusal-contract/`. HeavyMap's landing lists it under Recent. It is also listed on `/site/heavymap/claims-and-refusals/`, because that piece's `bucket` is `claims-and-refusals`. The other four items stay drafts and stay off the site until the same three edits are made for each one.

`post` and `article` stay reserved for human-written work. These five items are `explainer` or `summary`.
