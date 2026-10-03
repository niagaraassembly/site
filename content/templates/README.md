# Piece templates

Copy a file from this folder to `content/pieces/<slug>.md`, then replace the placeholders. The filename is the slug. A published piece is served at `/pieces/<slug>/`, which is its only address. A subsite lists that address. It does not give the piece a second one.

Rebuild after saving:

```bash
node scripts/subsite/build.mjs
```

Then, from the repository root:

```bash
python3 -m http.server 8019
```

Open `http://localhost:8019/site/greater-niagara/`.

## What to copy

| File | Use it for |
|---|---|
| `update.md` | An ongoing project update. Published updates form the landing-page timeline. |
| `data.md` | A data piece. Includes dataset, geography, period, units, licence, and `comparable`. |
| `summary.md` | A summary. |
| `explainer.md` | A general-reader explanation. Link down to the technical piece that backs it. |
| `post.md` | A shorter dated piece. |
| `article.md` | A theoretical article. |
| `overlap.md` | An overlap. Ingredients are required. There is no fixed subtopic list. |
| `gathering.md`, `processing.md`, `packaging.md`, `publishing.md` | The technical pipeline. Set `subcategory` to one of that subsite's local slugs. |

## How the front matter maps

- `type` is a filter (`update`, `data`, `summary`, `explainer`, `post`, `article`). It is not the navigation.
- `bucket` chooses the section: `overviews`, `overlaps`, `gathering`, `processing`, `packaging`, `publishing`. Depth is derived from the bucket. Do not add a `depth` field.
- `topic` is required on Overviews. Use an id from `content/topics.json`. The same id is what lets a piece sit beside another region's piece on that theme.
- `subcategory` is optional, and only for the four pipeline buckets. The slugs for Greater Niagara are the seed list in `content/subsites/greater-niagara.json`.
- `places` is how the piece is listed. Use ids from `content/geo.json`. A town inside Ontario or New York falls inside the Greater Niagara region. Tagging `region:greater-niagara` covers the whole region.
- `status: draft` is checked and then withheld. `status: published` is written to the site, and only after the owner has approved it. `status: superseded` needs `supersededBy` and is also withheld.

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
