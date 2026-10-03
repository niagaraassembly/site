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

- `type` is a filter (`update`, `data`, `summary`, `explainer`, `post`, `article`). It is not the navigation, except where a subsite's own nav says a link is that type. Greater Niagara's Updates and Explainers links work that way.
- `bucket` is the pipeline-stage designation. The values are `overviews`, `overlaps`, `gathering`, `processing`, `packaging`, and `publishing`. Gathering, processing, packaging, and publishing stay valid on every piece that is one of those stages. Greater Niagara does not put those four in the sidebar: the Methods page lists them and filters by stage. HeavyMap still has a sidebar section for each. A subsite may also define extra section slugs and use one as `bucket`. Depth is derived from the bucket. Do not add a `depth` field.
- `explore` and `theme` are optional, and only for Greater Niagara. `explore` is `companies`, `people-and-organizations`, `hubs-and-funders`, or `places`. `theme` is an id from that subsite's Themes group. They are how a reading piece shows up under Explore and Themes. Overviews is not a Greater Niagara section.
- `topic` is required when `bucket` is `overviews` and the piece is listed on a subsite that still has an Overviews section. HeavyMap's topic ids are in `content/subsites/heavymap.json`. `content/topics.json` is not Greater Niagara's sidebar. Two pieces sit side by side only when they use the same topic id.
- Overlaps is editorial. It names opportunity as shared interests among parties. It is not applied as a literal, data-derived rule on every subsite. On Greater Niagara it is a Stories link. On HeavyMap it is a section with no seeded rules. Ingredients are required only when a piece's bucket is `overlaps`.
- `subcategory` is optional, and only for the four pipeline stages. The slugs come from that subsite's `pipeline` object. On Greater Niagara those names are listed under the matching stage on the Methods page. They are not sidebar links.
- `places` is how the piece is listed. Use ids from `content/geo.json`. A town inside Ontario or New York falls inside the Greater Niagara region. Tagging `region:greater-niagara` lists the piece on Greater Niagara. Tagging `region:heavymap` lists it on HeavyMap. A place id lists the piece on every subsite whose region contains that place.
- `status: draft` is checked and then withheld. `status: published` is written to the site, and only after the owner has approved it. `status: superseded` needs `supersededBy` and is also withheld.

## Generate a new subsite

The generator is `node scripts/subsite/build.mjs`. It reads every `content/subsites/*.json` file. Greater Niagara is the pattern for a regional profile. HeavyMap is the pattern for a technical tool subsite. Copy the blank file rather than copying either of those by hand.

1. Copy `content/templates/subsite.example.json` to `content/subsites/<slug>.json`. Set `slug`, `id` (`subsite:<slug>`), `title`, `summary`, `why`, `span`, `focus`, and `landing` (`/site/<slug>/`).
2. Add a region to the `regions` array in `content/geo.json` if the subsite needs places that are not already inside an existing region. The id looks like `region:<slug>`. Put that id in the subsite's `regions` array. Say, in `span`, which official names the region is not. Niagara Region is the Ontario upper-tier municipality, not a synonym for a wider area.
3. Add a glossary term in `content/glossary.json` whose `id` matches `glossaryTerm`, and whose `regions` include the new region id. The landing page renders that term in the margin.
4. Choose the sidebar. If `nav` is omitted, the sidebar is two groups: **Sections** (the six shared names, then any `sections`) and **Topics** (that subsite's Overview topics). That is HeavyMap. To draw a different sidebar, set `nav` to labelled groups. Each item needs `slug`, `title`, `summary`, and `match` (or `"stages": true` for a Methods page). Item slugs become the page paths `/site/<slug>/<item>/`. That is Greater Niagara: Explore, Themes, Stories, and Methods. A subsite with `nav` does not also emit the default bucket pages.
5. Set `topics` when the subsite uses the default Overviews section. HeavyMap lists `{ "id", "title" }` objects. Do not treat `content/topics.json` as every subsite's nav.
6. Set `pipeline` to the local subcategory slugs for `gathering`, `processing`, `packaging`, and `publishing`. On a default sidebar they appear on the stage pages. On a Methods page they are named under each stage. They are not a sidebar group.
7. Set `sections` for extra links on the default Sections group. Each needs `slug`, `title`, `summary`, and `paragraphs`. `slug` must not be one of the six shared buckets. `kind` may be `glossary` or `roadmap` (a placeholder that does not invent gates). Omit `sections` when `nav` replaces the sidebar, and when there are none.
8. Optional `bucketPages.<bucket>.intro` and `paragraphs` replace that bucket's default text on a default sidebar. Use this for Overlaps when the subsite should say the section is editorial and empty of rules.
9. Copy a piece template into `content/pieces/<slug>.md`. Leave `status: draft`. For Greater Niagara set `explore` and `theme` on reading pieces, and set `bucket` to `gathering`, `processing`, `packaging`, or `publishing` on a methods piece. Drafts are validated and withheld.
10. Run `node scripts/subsite/build.mjs`. Open `/site/<slug>/`.

The current page is `aria-current="page"`. On the default sidebar, a topic page also marks Overviews, and a subcategory page marks its stage, with `aria-current="true"`.

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
