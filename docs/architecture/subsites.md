# Regional subsites

- Recorded: 2026-10-02. First subsite named Greater Niagara on 2026-10-03. Second subsite, HeavyMap, recorded the same day. Topic lists and extra sections are per subsite as of that date. Greater Niagara’s sidebar was rebuilt the same day (§12).
- Status: decisions below were agreed with Morgen. Anything under **Open** is not decided.
- Scope: how a regional subsite is organized, addressed, and read. Visual design follows this repository’s existing site. This document does not specify colour, typography, or layout implementation.
- Subject of the first subsite: **Greater Niagara** (`/site/greater-niagara/`). It spans the Niagara area across New York and Ontario. That span is a region grouping for the subsite. **Niagara Region** remains the name of the Ontario upper-tier municipality, as in [`atlas/GLOSSARY.md`](../../atlas/GLOSSARY.md). The atlas **study area** remains the name for data the atlas currently holds. Greater Niagara is wider than both.

**Summary.** A subsite is a lens on niagaraassembly.com, with its own content and reading experience. The first subsite is Greater Niagara, a non-technical profile of the industrial ecosystem across the Niagara area in New York and Ontario: existing companies, their activities, and investment. Its sidebar is Explore, Themes, Stories, and Methods (§12). The second is HeavyMap, a technical scaffold for the HeavyMap tool, which reads public data for cross-border Niagara. HeavyMap keeps the default sidebar: six sections, its own topics, and extra sections. Navigation is defined on each subsite. The four pipeline stages stay valid values of a piece’s `bucket` field even when they are not sidebar links. Comparison across subsites happens when two pieces use the same topic id, not because every subsite shares one navigation list. Agriculture and food is one Greater Niagara theme, not the lead subject. Decisions in this document were agreed with Morgen; open items are collected in §9.

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
| Subsite | A definition: a set of regions, a navigation (the default six sections, or a custom set of groups), a topic list when the default Overviews section is used, any extra sections, and a landing page. |

A piece appears in a subsite when its places fall inside that subsite’s regions. A piece that covers a whole region may tag the region directly. Renaming a region does not change its id and does not break existing addresses (§4).

The first subsite’s display name is Greater Niagara. Its landing slug is `greater-niagara`. Its seed region id is `region:greater-niagara` (§10). HeavyMap, the second subsite, uses `region:heavymap` (§11).

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

Types are filters. They are not the main navigation, except where a subsite’s own nav says a link is that type. Greater Niagara’s Updates and Explainers links work that way. Navigation is defined on each subsite (§3).

---

## 3. Navigation

**Decided, revised 2026-10-03.** Navigation is defined on each subsite. An earlier draft of this section treated the Overview topics as one global list and treated the four pipeline buckets as the same technical nav on every subsite. That is withdrawn.

A subsite that omits `nav` uses the default sidebar below: six sections, then that subsite’s topics, then any extra sections. HeavyMap uses that default. A subsite that sets `nav` draws its own labelled groups and does not also emit the six section pages. Greater Niagara does that (§12). The four stage names remain valid `bucket` values either way.

The default sections:

| Section | Role |
|---|---|
| Overviews | The subsite’s own topics. The list is in that subsite’s config, not in one global nav. |
| Overlaps | Editorial and conceptual. It shows opportunity as shared interests among parties. It is not a data-derived rule list, and a subsite may use it lightly or leave it empty (§3.2). |
| Gathering | How sources were found. Local subcategories, defined for that subsite. |
| Processing | How records were read and joined. Local subcategories, same rule. |
| Packaging | How data was combined. Local subcategories, same rule. |
| Publishing | What is published, and in what form. Local subcategories, same rule. |

A subsite may add further sections. Those sections are not copied onto the others (§3.5).

### 3.1 Overviews

Overviews are organized by topic. Topics belong to the subsite. Two pieces can sit side by side when they use the same topic id. They do not sit side by side merely because both subsites have an Overviews section.

`content/topics.json` is the catalog for a subsite that still uses this default Overviews section and sets `topics: null`. Greater Niagara no longer does. Its reading groups are Explore and Themes (§12). The file still holds the earlier placeholder ids, so a piece with `bucket: overviews` and one of those ids still validates:

- Manufacturing and supply chains
- Research and innovation hubs
- Workforce and training
- Funding and programs
- Technology adoption and automation
- Trade and logistics
- Land, sites and facilities

Agriculture and food is a Greater Niagara theme. It is not an entry in `content/topics.json`, and it is not the lead subject of that subsite.

HeavyMap is technical. Its Overview topics are data kinds, stored on `content/subsites/heavymap.json`, not in `content/topics.json`:

- Zoning and land use
- Parcels and buildings
- Business and employment registers
- Facilities and permits
- Rail, roads and truck routes
- Ports, border and airports
- Constraints and hazards
- Brownfields and reuse
- Servicing and terrain

### 3.2 Overlaps

Overlaps is an editorial and conceptual section. It is meant to show opportunity arising from shared interests among various parties. It is not applied literally, and it is not data-derived, on every subsite. Each subsite may use it lightly or editorially. HeavyMap has the landing page and no seeded overlap rules.

When a subsite does publish an overlap, the piece has no fixed subtopics. It names ingredients. Each ingredient has a kind and a link:

| Kind | Links to |
|---|---|
| `trend` | An Overview topic, a place, an entity, or a dataset |
| `characteristic` | An Overview topic, a place, an entity, or a dataset |
| `place-asset` | An Overview topic, a place, an entity, or a dataset |
| `capital` | An Overview topic, a place, an entity, or a dataset |

An overlap that carries a claim needs sources, and it needs the same owner approval as every other piece (§7).

Where two subsites both publish overlaps, a shared combination of ingredients can be read across them. That is optional. It is not a rule the build applies to HeavyMap.

### 3.3 The four pipeline sections

Gathering, Processing, Packaging, and Publishing are the pipeline. They are valid values of `bucket` on every piece that is one of those stages. On a technical subsite that uses the default sidebar they are four sections: the record of how evidence was found, read, combined, and released. On Greater Niagara they are not sidebar links. The Methods page lists the pieces and filters by those four stages (§12). The subcategory labels stay local to the subsite.

| Section | What the reader finds there |
|---|---|
| Gathering | Discovering the available data, including difficulties and results |
| Processing | What was found, and what is unique or interesting about different datasets |
| Packaging | Decisions and techniques used to combine and package the data |
| Publishing | The state of what is published, and in what forms, updated routinely |

Subcategories are a list on that subsite’s config. They follow that subsite’s real sources, or, while the page is still a scaffold, the placeholder names chosen for it. They are not a second global list. Greater Niagara’s seed labels include “municipal records” and “company directories”. HeavyMap’s are the tool’s steps (recon and source registry, fetch and cache, licence triage, and the rest in §11). Another subsite may need different names, and a different count.

### 3.4 Depth

Depth follows the section for the six shared names. It does not need its own stored field when the section is known.

| Sections | Depth | Reader |
|---|---|---|
| Overviews, Overlaps | Explanatory | Whoever that subsite is written for. Greater Niagara’s reader is general. HeavyMap’s Overviews are still explanatory in form, and the subject is technical. |
| Gathering, Processing, Packaging, Publishing | Technical | Data, formatting, methods |

An extra section says in its own page whether it is a method page or a short orientation. That is not stored as a `depth` field.

Explanatory pieces and technical pieces stay linkable either way. An explanatory piece can link down to a technical piece. A technical piece can link back up.

### 3.5 Extra sections

**Decided.** Sections other than the six are per subsite. Different subsites have different focus, so they do not share one navigation tree.

Greater Niagara has no extra sections. Its sidebar is the custom navigation in §12, not the default six sections.

HeavyMap adds six, all scaffold pages:

| Section | What the page is for |
|---|---|
| Layers and data catalogue | Coverage of each dataset, per place. No rows are filled in. |
| Claims and refusals | Method names: evidence grades, source stamps, refusal codes `not_in_coverage`, `not_licensed`, `not_joined`, and forbidden words. The scale, the stamp format, and the word list are not defined. The codes are not applied to a dataset. |
| Licences and publication limits | A placeholder. Not a licence matrix, and not a release. |
| Geography and coverage | The seed region `region:heavymap`, and the names it is not. |
| Status and roadmap | A placeholder. Numbered gates are not defined. |
| Glossary | Terms from `content/glossary.json` that apply to this subsite. |

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
2. Latest updates (`type: update` only).
3. Recent: every published piece for that subsite, newest `date` first.
4. Featured: only pieces whose front matter says `featured: true`. It is not the first few pieces.
5. Entry points into that subsite’s navigation: the default six sections and topics, or the groups that subsite defines.

An empty list is one sentence. The build does not invent a sample piece.

Every piece shows its status, its type, and its last-updated date. A data page says what the data is, where it came from, and how fresh it is. Updates form a running timeline.

---

## 6. Front matter

**Decided** as the intended fields. **Open** as a storage format: this is a draft schema. It has not been validated against how this repository stores pages today. See §8 before treating any field name as already implemented.

The same fields on every piece are what make a cross-subsite view possible. A piece appears side by side with a piece from another subsite only when both use the same topic id. There is not one global topic list. A data piece in that view also has `comparable: true`, and it shares units and geography levels with the pieces beside it.

`depth` is not a stored field. It is derived from `bucket` (§3.4).

| Field | Required | Applies to | Notes |
|---|---|---|---|
| `title` | required | every piece | |
| `summary` | required | every piece | Short account of the piece. |
| `date` | required | every piece | Publication date (`YYYY-MM-DD`). |
| `updated` | required | every piece | Last-updated date. Equals `date` until the piece changes. |
| `author` | required | every piece | Named author of the piece. |
| `type` | required | every piece | `update`, `data`, `summary`, `explainer`, `post`, or `article`. |
| `bucket` | required | every piece | The pipeline-stage designation, or an extra section slug. Values include `overviews`, `overlaps`, `gathering`, `processing`, `packaging`, and `publishing`. The four stage names stay valid when the subsite does not show them as sidebar links (§3.3, §12). An extra section slug is valid when a subsite that lists the piece defines it (§3.5). |
| `topic` | required on Overviews | `bucket: overviews` | One id from that subsite’s topic list, when the subsite still has an Overviews section (§3.1). |
| `explore` | optional | Greater Niagara reading pieces | One slug from that subsite’s Explore group (§12). |
| `theme` | optional | Greater Niagara reading pieces | One slug from that subsite’s Themes group (§12). |
| `subcategory` | optional | the four pipeline stages | A local subcategory slug from that subsite’s config. On Greater Niagara the name is listed under that stage on the Methods page. It is not a sidebar link. |
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

- The same topic id is what puts two pieces in a cross-subsite view. The id has to be one that both subsites actually use.
- A data piece joins that view only when `comparable` is `true` and the other pieces use the same `units` and the same `geography` levels.
- Local pipeline subcategories stay inside one subsite. They are not a comparison key.
- Overlaps are editorial. A shared ingredient combination can be read across subsites only when both subsites have published overlaps. It is not applied as a data rule (§3.2).

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
- [x] Topic lists are per subsite, not one global nav. §3.1. HeavyMap’s list is on its config. `content/topics.json` remains the catalog for a default Overviews section with `topics: null`. Greater Niagara’s sidebar no longer uses that file (§12). The contents of both lists are still placeholders.
- [ ] The final topic list for each subsite that still uses Overviews. §3.1. Greater Niagara’s Explore and Themes labels are the owner’s grouping; the pieces under them are still drafts.
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
| Side navigation and the right margin | The global top bar is unchanged. The subsite nav sits in the left margin on a wide screen, using the same breakpoint and width as the Apps panel (`.appspanel--side` in `assets/css/site.css`). A subsite that omits `nav` gets two groups: **Sections** (the six names, then any extra sections) and **Topics** (that subsite’s Overview topics). A subsite that sets `nav` gets the groups in its config. Greater Niagara’s groups are in §12. Local pipeline subcategories are not sidebar links. On a narrower screen the groups stay visible and stack above the article. The current page is `aria-current="page"`. On the default sidebar, a topic page also marks Overviews, and a subcategory page marks its stage, with `aria-current="true"`. Margin items use the right margin on the wide screen and stay inline on a narrower one. |
| Where subsite pages come from | Generated HTML under `site/` and, once a piece is published, `pieces/`. The wordmark menu in `assets/js/sitenav.js` is not the subsite menu. |

`content/geo.json`, `content/topics.json`, `content/glossary.json`, and `content/subsites/greater-niagara.json` are seed data. Greater Niagara’s pipeline subcategory names are placeholders, not a finished survey. Its sidebar labels are the grouping in §12.

---

## 11. A second subsite, and how to generate one

Recorded 2026-10-03. HeavyMap is at `/site/heavymap/`. It reuses the same generator and the same piece templates, and it uses the default two-group sidebar. Greater Niagara’s navigation was rebuilt after this section was written (§12). HeavyMap’s sidebar was left as it is.

HeavyMap’s seed region is `region:heavymap`. Members are Niagara Region (the Ontario upper-tier municipality), Niagara County, New York, and Erie County, New York. That is a coverage placeholder for the tool, not a finished map, and not a second name for Niagara Region. Greater Niagara’s region is still `region:greater-niagara`, whose members are Ontario and New York. A piece that names a town inside both regions can list on both subsites. The HeavyMap drafts name `region:heavymap` only.

Overlaps on HeavyMap is the editorial landing page. No overlap piece is seeded.

Status and roadmap is a placeholder page. It does not define gates.

To generate another subsite, follow [content/templates/README.md](../../content/templates/README.md). Short version: copy `content/templates/subsite.example.json` to `content/subsites/<slug>.json`, add a region and a glossary term if needed, choose the default sidebar or a custom `nav`, set topics when Overviews is used, set pipeline subcategories, and set extra sections only for the default Sections group. Copy piece templates into `content/pieces/` with `status: draft`, and run `node scripts/subsite/build.mjs`. Only `status: published` is written to the site, and publication still waits on Morgen.

---

## 12. Greater Niagara’s navigation

Recorded 2026-10-03, after HeavyMap. Greater Niagara is the non-technical profile: it brings the research to life for a general reader, covering existing companies, their activities, and investment. Overviews is not a section of this subsite. Explore and Themes take that place. The four pipeline stages are not sidebar links. They remain valid values of `bucket`.

The sidebar is four labelled groups, from `nav` on `content/subsites/greater-niagara.json`:

| Group | Links |
|---|---|
| Explore | Companies, People and organizations, Hubs and funders, Places |
| Themes | Sectors and supply chains, Investment and funding, Workforce and training, Technology and innovation, Cross-border links, Agriculture and food |
| Stories | Updates, Overlaps, Explainers |
| Methods | Methods |

A reading piece sets optional `explore` and `theme` to one of those slugs. Stories match by type or bucket: Updates are `type: update`, Overlaps are `bucket: overlaps`, and Explainers are `type: explainer` except pieces whose bucket is `overlaps`, so an overlap is listed once.

Methods (`/site/greater-niagara/methods/`) lists every piece whose `bucket` is `gathering`, `processing`, `packaging`, or `publishing`. The page groups those four stages and offers a filter for each. Seed subcategory names, including municipal records and company directories, are printed under the matching stage. They are not links in the sidebar, and this subsite does not generate a page per subcategory. The templates `gathering.md`, `processing.md`, `packaging.md`, and `publishing.md` stay in `content/templates/`.

`bucket: overviews` remains a valid value for a piece that still uses an Overviews section, including HeavyMap. Greater Niagara does not emit `/site/greater-niagara/overviews/` or the four stage paths.

HeavyMap does not set `nav`. Its sidebar stays Sections and Topics, including Gathering, Processing, Packaging, and Publishing as separate links.

---

## 13. Tracked pieces

Recorded 2026-10-03. HeavyMap pieces written for the content tracker live in `content/posts/items/`. That file is the piece. The build reads it with `content/pieces/`. It does not copy the file into `content/pieces/`.

`content/posts/created.csv` and `content/posts/index.csv` must name the same path and the same `status` as the front matter. While `status` is `draft`, `published_url` and `published_date` stay blank, and the build writes no page. A missing page is how a draft 404s. Setting `status: published` in the front matter, both CSVs, `published_date`, and `published_url` (`/pieces/<slug>/`) is what publishes it. The steps are in [content/posts/README.md](../../content/posts/README.md).

`featured: true` is a separate choice. Recent lists a published piece either way. Featured lists it only when that field is true.

Greater Niagara uses the same landing sections. Its sidebar is unchanged.
