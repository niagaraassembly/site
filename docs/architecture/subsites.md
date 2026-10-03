# Regional subsites

- Recorded: 2026-10-02. First subsite named Greater Niagara on 2026-10-03.
- Status: decisions below were agreed with Morgen. Anything under **Open** is not decided.
- Scope: how a regional subsite is organized, addressed, and read. Visual design follows this repository’s existing site. This document does not specify colour, typography, or layout implementation.
- Subject of the first subsite: **Greater Niagara** (`/site/greater-niagara/`). It spans the Niagara area across New York and Ontario. That span is a region grouping for the subsite. **Niagara Region** remains the name of the Ontario upper-tier municipality, as in [`atlas/GLOSSARY.md`](../../atlas/GLOSSARY.md). The atlas **study area** remains the name for data the atlas currently holds. Greater Niagara is wider than both.

**Summary.** A subsite is a template for profiling a regional industrial ecosystem on niagaraassembly.com, with its own content and reading experience. The first subsite is Greater Niagara, covering the Niagara area across New York and Ontario; the same template will later profile other regions and support comparison across them. The focus is industrial sectors, and agriculture and food is a specialized sector with its own pages inside that focus. Decisions in this document were agreed with Morgen; open items are collected in §9.

Source material for the first subsite is prepared outside this repository. It is not quoted or linked here. A piece from that material is published only after it meets the publishing rules in §7.

Each section states whether it is decided or still open. The draft front matter in §6 is a schema to validate against how this site actually stores content. It is not a claim that the site already stores pieces this way. Observed mismatches are in §8 and are open.

---

## 1. What a subsite is

**Decided.**

Places and regions are data. A subsite is a lens over that data.

| Term | Meaning |
|---|---|
| Place | A location in a shared hierarchy: town, county, province or state, country. Each place has a stable id. |
| Region | A named grouping of places. A place may belong to more than one region. Regions may overlap. |
| Subsite | A definition: a set of regions, an optional selection of topics, and a landing page. |

A piece appears in a subsite when its places fall inside that subsite’s regions. A piece that covers a whole region may tag the region directly. Renaming a region does not change its id and does not break existing addresses (§4).

The first subsite’s display name is Greater Niagara. Its landing slug is `greater-niagara`. The list of region ids inside that subsite waits on the place and region id scheme, which is open (§9).

---

## 2. Purpose and content types

**Decided.**

A subsite publishes ongoing project updates, data, summaries, explanatory pieces, posts, and theoretical articles.

| `type` | What it is |
|---|---|
| `update` | An ongoing project update. Updates form a running timeline. |
| `data` | A data piece: what was measured, where it came from, and how fresh it is. |
| `summary` | A summary of a body of work or a situation. |
| `explainer` | An explanatory piece for a general reader. |
| `post` | A post. |
| `article` | A theoretical article. |

Types are filters. They are not the main navigation. Navigation is by bucket, then by topic (§3).

---

## 3. Navigation

**Decided.** The shared topic list in §3.1 is a proposed starting set and is still open to revision.

Navigation is bucket-first, then topic. Six buckets sit at the top of every subsite.

| Bucket | Reader | Organized by |
|---|---|---|
| Overviews | General reader | One shared global set of topics, so regions can be compared on the same themes |
| Overlaps | General reader | No fixed subtopics. Tagged by ingredients (§3.2) |
| Gathering | Technical | 2 to 4 local subcategories, chosen for that subsite’s real sources |
| Processing | Technical | 2 to 4 local subcategories, same rule |
| Packaging | Technical | 2 to 4 local subcategories, same rule |
| Publishing | Technical | 2 to 4 local subcategories, same rule |

### 3.1 Overviews

Overviews are the plain picture of a region for a general reader. Topics are global: the same list is used on every subsite, so two regions can be set side by side on one theme.

Proposed starting topics, to be refined:

- Manufacturing and supply chains
- Research and innovation hubs
- Workforce and training
- Funding and programs
- Technology adoption and automation
- Trade and logistics
- Land, sites and facilities

Agriculture and food is a specialized sector with its own pages. It is not one of these generic topics.

### 3.2 Overlaps

An overlap is this project’s term for opportunity. It is a point where trends, characteristics, place assets, and pools of capital coincide so as to enable action, investment, and growth.

Overlaps have no fixed subtopics. Each overlap names its ingredients. Each ingredient has a kind and a link:

| Kind | Links to |
|---|---|
| `trend` | An Overview topic, a place, an entity, or a dataset |
| `characteristic` | An Overview topic, a place, an entity, or a dataset |
| `place-asset` | An Overview topic, a place, an entity, or a dataset |
| `capital` | An Overview topic, a place, an entity, or a dataset |

Overlaps are the most claim-heavy content on a subsite. They need sources, and they need the same owner approval as every other piece (§7).

Overlaps also feed cross-region views: where the same combination of ingredients appears in more than one region.

### 3.3 The four pipeline buckets

Gathering, Processing, Packaging, and Publishing are the technical pipeline. They are the record of how the subsite’s evidence was found, read, combined, and released.

| Bucket | What the reader finds there |
|---|---|
| Gathering | Discovering the available data, including difficulties and results |
| Processing | What was found, and what is unique or interesting about different datasets |
| Packaging | Decisions and techniques used to combine and package the data |
| Publishing | The state of what is published, and in what forms, updated routinely |

Each of the four has two to four local subcategories per subsite. Those subcategories follow that region’s real sources. They are not a second global list. A Gathering subcategory on one subsite might be “municipal records” or “company directories”; another region may need different names.

### 3.4 Depth

Depth follows the bucket. It does not need its own stored field when the bucket is known.

| Buckets | Depth | Reader |
|---|---|---|
| Overviews, Overlaps | Explanatory | General reader |
| Gathering, Processing, Packaging, Publishing | Technical | Data, formatting, zoning and land, methods |

Explanatory pieces and technical deep dives stay separate. An explanatory piece links down to the technical pieces that back it. Those technical pieces link back up.

---

## 4. Addresses

**Decided.** The canonical piece URL pattern was settled for this repository on 2026-10-03. See §10.

Subsite landing pages live at:

```text
https://niagaraassembly.com/site/<region-slug>/
```

The first landing page is `https://niagaraassembly.com/site/greater-niagara/`.

- The `/site/` prefix is permanent.
- Region slugs are permanent, short, and lowercase.
- Slugs under `/site/` are reserved, so a content piece cannot take the same address as a subsite.
- A renamed region keeps its old address. The old slug redirects to the new one.
- The region’s stable id does not change when its display name or slug changes.

Each piece has one canonical URL. That URL does not depend on any subsite. A subsite lists the piece; it does not give the piece a second address. A reader who arrives from a subsite may see that subsite’s navigation as context. The address stays the canonical one.

In this repository the canonical piece URL is `/pieces/<slug>/`. The slug is the piece’s markdown filename. It does not include the subsite. A published file keeps its filename; replacing the piece means a new file, `status: superseded` on the old one, and `supersededBy` pointing at the new canonical path.

---

## 5. Reading experience

**Decided** as organization. How the margin is used to best effect, and how margin items are authored, are open (§9).

The page follows the existing site’s design. The organization of a piece is:

- Navigation on one side.
- The article in the centre.
- The wide right margin for side-loaded items.

Margin items:

| Kind of item | Role |
|---|---|
| Definition | A term from the shared glossary. A term is defined once per region and appears wherever it is used. |
| Note | A supplementary note. |
| Quote | A pull quote. |
| Figure | An image or figure. |
| Go deeper | A link down to a technical piece that backs the passage. |

Each margin item is anchored to a spot in the text, and each has a kind. On a narrow screen, margin items collapse into inline notes.

A subsite landing page, in order:

1. What the subject is, and why it matters.
2. Latest updates.
3. A few featured pieces.
4. Entry points into Overviews, Overlaps, data, and the four pipeline buckets.

Every piece shows its status, its type, and its last-updated date. A data page says what the data is, where it came from, and how fresh it is. Updates form a running timeline.

---

## 6. Front matter

**Decided** as the intended fields. **Open** as a storage format: this is a draft schema. It has not been validated against how this repository stores pages today. See §8 before treating any field name as already implemented.

The same fields on every piece are what make a cross-region view possible. A piece appears side by side with pieces from other regions only when it uses a shared global topic. A data piece in that view also has `comparable: true`, and it shares units and geography levels with the pieces beside it.

`depth` is not a stored field. It is derived from `bucket` (§3.4).

| Field | Required | Applies to | Notes |
|---|---|---|---|
| `title` | required | every piece | |
| `summary` | required | every piece | Short account of the piece. |
| `date` | required | every piece | Publication date (`YYYY-MM-DD`). |
| `updated` | required | every piece | Last-updated date. Equals `date` until the piece changes. |
| `author` | required | every piece | Named author of the piece. |
| `type` | required | every piece | `update`, `data`, `summary`, `explainer`, `post`, or `article`. |
| `bucket` | required | every piece | `overviews`, `overlaps`, `gathering`, `processing`, `packaging`, or `publishing`. |
| `topic` | required on Overviews | Overviews | One value from the shared global topic list (§3.1). |
| `subcategory` | optional | the four pipeline buckets | A local subcategory for that subsite. Two to four per bucket. |
| `places` | required | every piece | Place ids, region ids, or both. This is how a subsite claims the piece. |
| `entities` | optional | every piece | Stable ids for firms, hubs, and other named things the piece covers. |
| `tags` | optional | every piece | Extra labels. They do not replace `topic`. |
| `ingredients` | required | Overlaps only | List of `{ kind, ref }`. `kind` is `trend`, `characteristic`, `place-asset`, or `capital`. `ref` points at an Overview topic, a place, an entity, or a dataset. |
| `status` | required | every piece | `draft`, `published`, or `superseded`. |
| `supersededBy` | required when superseded | superseded pieces | Link to the successor. |
| `sources` | required when the piece is data-backed or carries a claim | those pieces | Named sources. |
| `licence` | required | data-backed pieces | Licence of the underlying data. |
| `dataset` | required | `type: data` | Stable name of the dataset. |
| `geography` | required | `type: data` | Geography level (for example town, county, province or state). |
| `period` | required | `type: data` | Time period the figures cover. |
| `units` | required | `type: data` | Units of the figures. |
| `comparable` | required | `type: data` | `true` when the dataset follows the shared schema and may appear in a cross-region view. |

Cross-region rule, restated:

- Shared global `topic` is what puts a piece in a cross-region view.
- A data piece joins that view only when `comparable` is `true` and the other pieces use the same `units` and the same `geography` levels.
- Local pipeline subcategories stay inside one subsite. They are not a global comparison key.
- Overlaps compare across regions by shared ingredient combinations (§3.2).

### Example

Illustration only. The ids, source, and figures are placeholders, not a published piece and not a finding.

```yaml
title: "Manufacturing employment, two counties"
summary: "A county-level employment series for a cross-region comparison."
date: 2026-10-02
updated: 2026-10-02
author: "Niagara Assembly"
type: data
bucket: overviews
topic: manufacturing-and-supply-chains
places:
  - place:example-county-a
  - place:example-county-b
entities: []
tags: []
status: draft
sources:
  - name: "Example statistical agency"
    locator: "https://example.invalid/series"
    retrieved: 2026-10-02
licence: "Example open-data licence"
dataset: example-manufacturing-employment
geography: county
period: "2024"
units: jobs
comparable: true
```

An overlap adds `ingredients` and omits the data-only fields:

```yaml
type: explainer
bucket: overlaps
status: draft
places:
  - region:example-region
ingredients:
  - kind: trend
    ref: topic:technology-adoption-and-automation
  - kind: characteristic
    ref: topic:workforce-and-training
  - kind: place-asset
    ref: place:example-town
  - kind: capital
    ref: entity:example-fund
sources:
  - name: "Example source"
    locator: "https://example.invalid/report"
    retrieved: 2026-10-02
```

---

## 7. Publishing

**Decided** as the current rule. A formal approval workflow is open (§9).

Today, Morgen approves and publishes every piece, whether it was written by him or by an agent. Nothing is published without a named approver. Today that approver is Morgen.

- A data-backed piece names its sources and its licence.
- A piece that changes shows a new `updated` date.
- A piece that is replaced is marked `superseded` and links to its successor through `supersededBy`.
- Private owner-of-record data is not published.
- Internal strategy and outreach notes are not published.
- Individual contact details are not published.

`status` is the field a later workflow will use. A formal approval process can be added, including a different content system or a deeper use of GitHub Actions, without rewriting published pieces and without changing their addresses.

The form-approval Action already in this repository (`.github/workflows/approve-request.yml`) writes public JSON for site intake. It is not this editorial approval step.

---

## 8. Fit with this repository

**Open.** Observations from the tree on 2026-10-02. They are recorded so the draft schema is not mistaken for the current storage format. No site code, route, or template was changed to close them.

| What this document assumes | What the repository does today |
|---|---|
| Pieces carry the front matter in §6 | Public pages are static HTML (`index.html` under a path). No YAML front matter is in use. |
| A canonical piece URL, independent of the subsite | A page’s address is its directory. Examples: `/updates/`, `/places/hamilton/`, `/MAGS/START/issue-1-09-26/`. |
| Landing pages at `/site/<region-slug>/` | No `/site/` routes exist. The top bar is `assets/js/sitenav.js`. |
| A shared place hierarchy with stable ids | `/places/` is a list of presence pages (Hamilton, Fort Erie, GB, WNY, Dunkirk NY, Rochester, Erie PA). Atlas geography terms live in `atlas/GLOSSARY.md`. |
| A reader glossary, one definition per region, shown in the margin | `atlas/GLOSSARY.md` defines jurisdictions for the atlas (Niagara Region, Niagara Peninsula, study area). It is not that reader glossary. |
| Side navigation, centre article, anchored margin items | The page is one centred column (`.frame`, `--measure: 46rem` in `assets/css/site.css`). On a wide viewport the Apps panel hangs in the right margin (`.appspanel--side`). Narrower viewports pull that panel above the frame. |
| Editorial status `draft` / `published` / `superseded` | Intake approval writes `data/*.json` through `scripts/approve_request.py`. Magazine drafts under `MAGS/START/Issue 1/` are Markdown with a title and a date in the heading, and no front matter. |

---

## 9. Open items

These are unset. Do not invent values for them while following this document.

- [x] Canonical piece URL, for this repository: `/pieces/<slug>/`, slug = markdown filename. §4 and §10.
- [ ] The final shared global topic list. §3.1 is a placeholder, stored for now in `content/topics.json`.
- [x] Place and region ids, as seed data: `content/geo.json`. The scheme is in §10. It is not a finished gazetteer.
- [x] Greater Niagara’s seed region id is `region:greater-niagara`, whose members are Ontario and New York. §10.
- [x] Margin items are authored as `:::` fences in the markdown body. §10.
- [ ] How best to use the right margin. The first build reuses the Apps panel’s margin and leaves the notes inline on a narrow screen.
- [ ] The later formal approval workflow, and where the named approver is recorded once that workflow exists. Until then, only `status: published` is written to the site, and publication still waits on Morgen.
- [x] The reader-facing glossary lives at `content/glossary.json`. `atlas/GLOSSARY.md` stays the atlas jurisdiction glossary.
- [x] §6 checked against this repository’s storage. Adaptations are in §10. The public pages are still static HTML.
- [ ] How existing site sections (Updates, START, SECTOR, SOLO, and the `/places/` pages) relate to subsite pieces. They are unchanged. The subsite does not replace them.

---

## 10. First build in this repository

Recorded 2026-10-03, when Greater Niagara was added at `/site/greater-niagara/`. The public site stays static HTML, which is how every other page here is stored. Markdown in `content/pieces/` is the authoring source. `node scripts/subsite/build.mjs` writes HTML only for `status: published`.

Differences from the draft schema, taken so the build matches this repository:

| Draft schema | What the build does |
|---|---|
| Canonical piece URL unset | `/pieces/<slug>/`. The slug is the markdown filename. |
| `places` shown as `place:example-county` | Ids are strings from `content/geo.json`, such as `town:buffalo` and `region:greater-niagara`. A colon is part of the id. In front matter there is no space after that colon, so the id stays one string. |
| Place levels: town, county, province or state, country | The seed adds `municipality` for single-tier and upper-tier municipalities. Hamilton and Niagara Region are municipalities, not towns. |
| Glossary home unset | `content/glossary.json`. A `:::definition` fence uses the term’s id. |
| Margin syntax unset | Inline `:::note`, `:::quote`, `:::figure`, `:::definition`, and `:::deeper` fences, anchored where they sit in the body. |
| `depth` stored or not | Not stored. It is derived from `bucket`. |
| Editorial approval | Unchanged: Morgen approves. The build’s extra gate is mechanical: `draft` and `superseded` are not written to the public HTML. |
| Side navigation and the right margin | The global top bar is unchanged. Subsite sections are a list that sits in the left margin on a wide screen, using the same breakpoint and width as the Apps panel (`.appspanel--side` in `assets/css/site.css`). On a narrower screen that list shows the six buckets, and each bucket page lists its topics or subcategories in the article. Margin items use the right margin on the wide screen and stay inline on a narrower one. |
| Where subsite pages come from | Generated HTML under `site/` and, once a piece is published, `pieces/`. The wordmark menu in `assets/js/sitenav.js` is not the subsite menu. |

`content/geo.json`, `content/topics.json`, `content/glossary.json`, and `content/subsites/greater-niagara.json` are seed data. The topic list and the pipeline subcategory names are the placeholders from this document, not a finished survey.
