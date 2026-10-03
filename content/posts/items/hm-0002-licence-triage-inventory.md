---
content_id: HM-0002
title: "Licence triage across the dataset inventory"
summary: "Agent-written tally of licence_clearance on the 82-row HeavyMap inventory, with the MPAC, NPCA, Seaway, and OpenStreetMap rows stated as observed and not cleared."
date: 2026-10-03
updated: 2026-10-03
author: "Niagara Assembly"
author_kind: agent
type: summary
bucket: gathering
subcategory: licence-triage
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
  - name: "Dataset inventory v4 notes"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/02-dataset-inventory-v4-NOTES.md"
    retrieved: 2026-10-03
  - name: "Authority scale and meta proposals, section 4"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/heavymap-planning/12-authority-scale-and-meta-proposals.md"
    retrieved: 2026-10-03
  - name: "Atlas data sources"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/niagara-atlas/DATA-SOURCES.md"
    retrieved: 2026-10-03
  - name: "ADR 0002"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/docs/architecture/adr/0002-joining-concepts-and-terminology.md"
    retrieved: 2026-10-03
---

Agent-written. `author_kind` is `agent`. `status` is `draft`. This file is not a publication and not a legal conclusion.

The subsite is HeavyMap. The place tag is `region:heavymap`: Niagara Region (the Ontario upper-tier municipality), Niagara County, New York, and Erie County, New York. Hamilton is not a member of that region. Rows below that name Hamilton are inventory or planning rows. They are not a claim that Hamilton is inside `region:heavymap`.

Read on 2026-10-03 from `niagaraassembly/heavymap` commit `fbbde09babe2a5d3b6472c4834f09b8261573c0c`.

# Where the counts come from

`02-dataset-inventory-v4-NOTES.md` names two canonical files: `02-dataset-inventory-v4.csv` and `02-dataset-inventory-v4.xlsx`. It states data rows: 82. The csv was not in that commit. The xlsx was. The Inventory sheet dimension is `A1:BN83` (one header row and 82 data rows). The tallies below were counted from the inline strings in that sheet on 2026-10-03. Column `licence_clearance` is column V.

| `licence_clearance` | Rows |
|---|---:|
| `attribution_ok` | 43 |
| `unclear` | 33 |
| `sharealike` | 4 |
| `forbidden_republish` | 2 |
| Total | 82 |

43 + 33 + 4 + 2 = 82. That is addition of the four cells, not a separate source figure.

These labels are the inventory's own values. This draft does not clear a licence and does not restate a label as a legal result.

# Rows marked `forbidden_republish`

Two data rows. No other row in the sheet has that `licence_clearance` value.

| `dataset_id` | `working_name` | `ship_status` | `status_in_product` | `disposition_d5` |
|---|---|---|---|---|
| `mpac_ontario_parcels` | MPAC / Ontario land parcels (assessment) | `n/a` | `blocked` | `n/a` |
| `seaway_vessel_transits` | St. Lawrence Seaway vessel transits | `n/a` | `blocked` | `link` |

`seaway_vessel_transits`, column `license_redistribution_risk`, contains the text `robots.txt Disallow: /`. `niagara-atlas/DATA-SOURCES.md` records the same restriction: the vessel-transit page is public and server-rendered, but `robots.txt` is `Disallow: /`, and the file says not to build an automated collector against it. This draft does not add a collector and does not clear the row.

`mpac_ontario_parcels` stays blocked in the inventory. `docs/architecture/adr/0002-joining-concepts-and-terminology.md` states: "MPAC assessment data stays `not_licensed`." `heavymap-planning/12-authority-scale-and-meta-proposals.md` section 4, built 2026-09-25, says the same status line: observed, not cleared, and keep `not_licensed` for MPAC assessment data. This draft does not read an assessment value and does not name an owner.

# NPCA rows

Three inventory rows have `npca` in `dataset_id`. None has `status_in_product` `ingested`.

| `dataset_id` | `working_name` | `priority_band` | `licence_clearance` | `disposition_d5` | `ship_status` | `status_in_product` |
|---|---|---|---|---|---|---|
| `npca_regulation_lands` | NPCA Approximate Regulation Lands | `P0` | `unclear` | `simplify` | `not_started` | `recon_done` |
| `npca_floodplain` | NPCA Regulated Floodplain Extent | `P0` | `unclear` | `simplify` | `not_started` | `recon_done` |
| `npca_assessment_parcels` | NPCA Assessment Parcels | `later` | `unclear` | `n/a` | `unknown` | `blocked` |

`npca_regulation_lands` and `npca_floodplain` are separate from the assessment-parcel row. Their product status is `recon_done`. They are not ingested.

`npca_assessment_parcels` is `blocked`. It is not ingested.

Section 4 of `12-authority-scale-and-meta-proposals.md` records that NPCA parcel items name an Open Government Licence v2 through a PDF link on `gis.npca.ca`, and that the link returns 404, so the licence text was not read. This draft did not request that URL again on 2026-10-03. The 404 is the planning file's record, dated in that file as built 2026-09-25. The same section's status line is: observed, not cleared. It says not to ingest the NPCA parcel layers. ADR 0002 repeats: "NPCA parcel layers are not ingested."

The planning file's geographic description of the NPCA fabric includes places outside `region:heavymap`, including Hamilton and Haldimand County. That description is not a change to the subsite's region members.

# OpenStreetMap share-alike rows

All four `sharealike` rows are OpenStreetMap layers:

| `dataset_id` | `working_name` | `ship_status` | `status_in_product` |
|---|---|---|---|
| `osm_industrial_land` | OSM industrial land (Overpass) | `committed_thin` | `shipped` |
| `osm_rail_corridors` | OSM rail corridors | `committed_thin` | `shipped` |
| `osm_brownfield_disused` | OSM brownfield & recorded disused | `committed_thin` | `shipped` |
| `osm_industrial_places` | OSM industrial places / facilities | `committed_thin` | `shipped` |

`ship_status` and `status_in_product` are inventory cells about repo state. They are not a publication from this site. See HM-0004 for the `ship_status` tally.

`niagara-atlas/DATA-SOURCES.md` records the OpenStreetMap licence as ODbL 1.0, attribution and share-alike on derived data. It states that any published derivative that mixes OSM geometry with other sources may trigger share-alike. That sentence is the file's record. This draft does not clear the licence and does not publish a derived layer.

# What was not done

- No licence was cleared.
- No row was marked ingested that the inventory does not already mark `ingested`. The three NPCA rows above are not marked `ingested`.
- The missing csv was not reconstructed.
- No owner value and no business name from a join were copied.
