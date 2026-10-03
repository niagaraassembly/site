# Piece templates and new subsites

Copy a file from this folder to `content/pieces/<slug>.md`, then replace the placeholders. The filename is the slug. A published piece is served at `/pieces/<slug>/`, which is its only address. A subsite lists that address. It does not give the piece a second one.

Rebuild after saving:

```bash
node scripts/subsite/build.mjs
```

Then, from the repository root:

```bash
python3 -m http.server 8019
```

Open `http://localhost:8019/site/greater-niagara/` or `http://localhost:8019/site/heavymap/`.

## What to copy

| File | Use it for |
|---|---|
| `update.md` | An ongoing project update. Published updates form the landing-page timeline. |
| `data.md` | A data piece. Includes dataset, geography, period, units, licence, and `comparable`. |
| `summary.md` | A summary. |
| `explainer.md` | A general-reader explanation. Link down to the technical piece that backs it. |
| `post.md` | A shorter dated piece. |
| `article.md` | A theoretical article. |
| `overlap.md` | An editorial overlap. Ingredients are required when you write one. Overlaps is not a data-derived rule list, and a subsite may leave the section empty. |
| `gathering.md`, `processing.md`, `packaging.md`, `publishing.md` | The pipeline sections. Set `subcategory` to a slug from that subsite's config. |
| `extra-section.md` | A piece whose `bucket` is an extra section slug from that subsite's config. |
| `subsite.example.json` | A blank subsite definition. See below. |

## How the front matter maps

- `type` is a filter (`update`, `data`, `summary`, `explainer`, `post`, `article`). It is not the navigation.
- `bucket` chooses the section. The six shared names are `overviews`, `overlaps`, `gathering`, `processing`, `packaging`, and `publishing`. A subsite may also define extra section slugs in its config. Use one of those slugs as `bucket` to list the piece on that section. Depth is derived from the bucket. Do not add a `depth` field.
- `topic` is required on Overviews. Use an id from **that subsite's** topic list. Greater Niagara, which sets `topics` to null, uses `content/topics.json`. HeavyMap lists its topics in `content/subsites/heavymap.json`. Two pieces sit side by side only when they use the same topic id. There is not one global topic nav.
- Overlaps is editorial. It names opportunity as shared interests among parties. It is not applied as a literal, data-derived rule on every subsite. HeavyMap has the section and does not seed overlap rules. Ingredients are required only when a piece's bucket is `overlaps`.
- `subcategory` is optional, and only for the four pipeline buckets. The slugs come from that subsite's `pipeline` object.
- `places` is how the piece is listed. Use ids from `content/geo.json`. A town inside Ontario or New York falls inside the Greater Niagara region. Tagging `region:greater-niagara` lists the piece on Greater Niagara. Tagging `region:heavymap` lists it on HeavyMap. A place id lists the piece on every subsite whose region contains that place.
- `status: draft` is checked and then withheld. `status: published` is written to the site, and only after the owner has approved it. `status: superseded` needs `supersededBy` and is also withheld.

## Generate a new subsite

The generator is `node scripts/subsite/build.mjs`. It reads every `content/subsites/*.json` file. Greater Niagara is the pattern for a regional profile. HeavyMap is the pattern for a technical tool subsite. Copy the blank file rather than copying either of those by hand.

1. Copy `content/templates/subsite.example.json` to `content/subsites/<slug>.json`. Set `slug`, `id` (`subsite:<slug>`), `title`, `summary`, `why`, `span`, `focus`, and `landing` (`/site/<slug>/`).
2. Add a region to the `regions` array in `content/geo.json` if the subsite needs places that are not already inside an existing region. The id looks like `region:<slug>`. Put that id in the subsite's `regions` array. Say, in `span`, which official names the region is not. Niagara Region is the Ontario upper-tier municipality, not a synonym for a wider area.
3. Add a glossary term in `content/glossary.json` whose `id` matches `glossaryTerm`, and whose `regions` include the new region id. The landing page renders that term in the margin.
4. Set `topics` to a list of `{ "id", "title" }`. Use `null` only when the subsite should take Greater Niagara's list in `content/topics.json`. Do not add another subsite's topics to that file.
5. Set `pipeline` to the local subcategory slugs for `gathering`, `processing`, `packaging`, and `publishing`. Those links appear on the bucket pages, not in the sidebar.
6. Set `sections` to any extra sidebar links. Each needs `slug`, `title`, `summary`, and `paragraphs`. `slug` must not be one of the six shared buckets. `kind` may be `glossary` (lists applicable terms) or `roadmap` (prints a placeholder and does not invent gates). Omit `sections` when there are none.
7. Optional `bucketPages.<bucket>.intro` and `paragraphs` replace that bucket's default text. Use this for Overlaps when the subsite should say the section is editorial and empty of rules.
8. Copy a piece template into `content/pieces/<slug>.md` for each example you need. Leave `status: draft`. Drafts are validated and withheld.
9. Run `node scripts/subsite/build.mjs`. Open `/site/<slug>/`.

The sidebar is two groups. **Sections** lists the six shared buckets, then any extra sections. **Topics** lists that subsite's Overview topics. The current page is `aria-current="page"`. A topic page also marks Overviews, and a pipeline subcategory page marks its bucket, with `aria-current="true"`.

## Margin items

In the body, a fence is anchored at that spot in the text:

```markdown
:::note
The note.
:::

:::definition greater-niagara
:::

:::quote
A short quote.
:::

:::figure
src: /assets/img/logo.jpg
alt: What the figure shows
:::

:::deeper
href: /pieces/some-technical-piece/
label: How the series was built
:::
```

`:::definition` uses an id from `content/glossary.json`. The glossary entry is the definition. On a wide screen the item moves into the right margin. On a narrow screen it stays under the paragraph.

The title in the front matter is the h1. In the body, `# ` is an h2 and `## ` is an h3.
