---
content_id: HM-0004
title: "Layer dispositions (ship, simplify, derive, tile, link)"
summary: "Agent-written tally of disposition_d5 on the 82-row inventory, a separate tally of ship_status as repo state, and D-5's contour estimate of about 2.5 MB from 3.11 GB."
date: 2026-10-03
updated: 2026-10-03
author: "Niagara Assembly"
author_kind: agent
type: summary
bucket: packaging
subcategory: layer-dispositions
places:
  - region:heavymap
entities: []
tags:
  - agent-written
status: draft
sources:
  - name: "Dataset inventory v4 workbook"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/02-dataset-inventory-v4.xlsx"
    retrieved: 2026-10-03
  - name: "Technology decisions, D-5"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/niagara-atlas/TECHNOLOGY-DECISIONS.md"
    retrieved: 2026-10-03
  - name: "PCDP vocabulary, dataset dispositions"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/docs/architecture/vocab/pcdp.vocab.json"
    retrieved: 2026-10-03
---

Agent-written. `author_kind` is `agent`. `status` is `draft`. This file is not a publication.

The subsite is HeavyMap. The place tag is `region:heavymap`: Niagara Region (the Ontario upper-tier municipality), Niagara County, New York, and Erie County, New York. The contour row named below includes Hamilton in its working name. Hamilton is not a member of `region:heavymap`.

Read on 2026-10-03 from `niagaraassembly/heavymap` commit `fbbde09babe2a5d3b6472c4834f09b8261573c0c`. The csv named in `02-dataset-inventory-v4-NOTES.md` was not in that commit. Counts are from the xlsx Inventory sheet, 82 data rows. `disposition_d5` is column AB. `ship_status` is column AD.

# `disposition_d5` on 82 rows

| `disposition_d5` | Rows |
|---|---:|
| `ship` | 27 |
| `simplify` | 20 |
| `derive` | 20 |
| `unknown` | 5 |
| `tile` | 4 |
| `link` | 3 |
| `n/a` | 3 |
| Total | 82 |

27 + 20 + 20 + 5 + 4 + 3 + 3 = 82.

`docs/architecture/vocab/pcdp.vocab.json`, `normative.dataset_dispositions`, names five tokens and attributes them to D-5: `ship`, `simplify`, `derive`, `tile`, `link`. The note there says disposition `derive` is not evidence grade `derived`. The inventory also contains `unknown` (5) and `n/a` (3). Those two values are not in the five-token list.

# `ship_status` is repo state, not publication

| `ship_status` | Rows |
|---|---:|
| `held_local` | 34 |
| `not_started` | 30 |
| `committed_thin` | 11 |
| `n/a` | 4 |
| `unknown` | 3 |
| Total | 82 |

34 + 30 + 11 + 4 + 3 = 82.

`committed_thin` 11 is a count of that cell. It is not a count of pages published on this site. Nothing in this draft is a release.

# D-5 contour estimate, dated 2026-08-23

`niagara-atlas/TECHNOLOGY-DECISIONS.md`, section "D-5 · Large-layer disposition — 2026-08-23", table of file sizes:

| | Files | Size | Share |
|---|---:|---:|---:|
| Two contour layers (#260, #114) | 2 | 3.11 GB | 63% |

The same section states the derive result as an estimate: four floats per unit, about 32 bytes per parcel, and "≈ 2.5 MB, from 3.11 GB. A reduction of roughly 1,200:1". Those two figures are the decision's estimate. This draft did not remeasure the contour files and did not recompute the ratio from a new file size.

The inventory row `hamilton_nf_contours`, working name "Hamilton Contours / Niagara Falls 1m Contours", has `size_order_of_magnitude` text "~3.1 GB combined (#260 + #114) — 63% of cache weight". Its `disposition_d5` is `derive`. Its `ship_status` is `held_local`. Its `status_in_product` is `ingested`.

D-5 states: "The contour GeoJSON stays in the local cache (gitignored) as the input to that derivation, and is re-pullable from the ledger endpoints. It is never committed and never served."

The inventory cell `ingested` and the D-5 sentence "never served" are both in the sources. This draft does not treat `ingested` as a public release.

D-5's disposition table:

| Disposition | Meaning in D-5 | Shipped, in D-5's column |
|---|---|---|
| `ship` | small enough as-is | yes |
| `simplify` | shipped as topology-simplified display geometry; precise version kept build-side | yes, reduced |
| `derive` | consumed at build, collapsed to attributes on units | no |
| `tile` | served as vector tiles for display at zoom | via tiles |
| `link` | referenced at source, not hosted | no |

# What was not done

- Contour bytes were not remeasured.
- The 2.5 MB figure was not checked against a generated attribute file. The attribute file is not in this site repository.
- No layer was published.
- `ship_status` was not read as a publication flag.
