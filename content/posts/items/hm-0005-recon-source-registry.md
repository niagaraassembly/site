---
content_id: HM-0005
title: "Recon and source registry: what the ledger records"
summary: "Agent-written record of the ingestion ledger status block dated 2026-08-23, the 32-row jurisdiction roster, and the Welland Hub count of 172 datasets against 44 in CKAN."
date: 2026-10-03
updated: 2026-10-03
author: "Niagara Assembly"
author_kind: agent
type: summary
bucket: gathering
subcategory: recon-and-source-registry
places:
  - region:heavymap
entities: []
tags:
  - agent-written
status: draft
sources:
  - name: "Ingestion ledger"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/niagara-atlas/INGESTION-LEDGER.md"
    retrieved: 2026-10-03
  - name: "Recon 2026-08-22"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/niagara-atlas/RECON-2026-08-22.md"
    retrieved: 2026-10-03
  - name: "Atlas backlog"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/niagara-atlas/BACKLOG.md"
    retrieved: 2026-10-03
  - name: "Jurisdiction roster"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/heavymap-planning/07-jurisdiction-roster-v1.md"
    retrieved: 2026-10-03
  - name: "Jurisdiction roster csv"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/heavymap-planning/07-jurisdiction-roster-v1.csv"
    retrieved: 2026-10-03
---

Agent-written. `author_kind` is `agent`. `status` is `draft`. This file is not a publication.

The subsite is HeavyMap. The place tag is `region:heavymap`. Members are Niagara Region (the Ontario upper-tier municipality), Niagara County, New York, and Erie County, New York. Niagara Region is one member, not the name of the subsite and not the name of the ledger. Hamilton is in the ledger and in the backlog. Hamilton is not a member of `region:heavymap`.

Read on 2026-10-03 from `niagaraassembly/heavymap` commit `fbbde09babe2a5d3b6472c4834f09b8261573c0c`.

# Ledger status block

`niagara-atlas/INGESTION-LEDGER.md` calls itself the authoritative record of what is in the merged collection. The status block says the ledger was regenerated on 2026-08-23.

| Status line | Figure in the file |
|---|---|
| Selection | Niagara 125 of 126 (all but #98). Hamilton 89 of 90 (all but #290). |
| Source layers resolved | 261 |
| Verified reachable | 238 |
| Blocked / no machine endpoint | 23 across 12 candidates |
| Downloaded | 231 layers, 2,414,630 features, 5085.8 MB |
| Raster services (metadata only) | 4 |
| Fetch failures | 3 |

Arithmetic on those printed cells, not a separate source total: 238 + 23 = 261. 231 + 4 + 3 = 238. The file prints the cells. It does not print those two sums.

The same status section states: "Downloaded ≠ ingested. Nothing here is in `data/` or rendered by the atlas yet; these are local working copies held for engine design." The local cache paths are `scripts/.cache/bulk/` and `scripts/.cache/hamilton/`, and the file says they are gitignored. This draft did not list that cache. The files are not in this site repository. The phrase that matches the ledger is: held locally, unpublished.

# Jurisdiction roster

`heavymap-planning/07-jurisdiction-roster-v1.md` says the companion csv has 32 jurisdiction rows. The csv at that commit was counted on 2026-10-03: 32 data rows.

That roster is a planning list of portals. It is not the member list of `region:heavymap`. The subsite region has three members, named above.

# Welland Hub and CKAN

Welland is a lower-tier municipality inside Niagara Region. Niagara Region is a member of `region:heavymap`. The Welland figures below are about Welland's catalogue, not about the whole subsite.

`niagara-atlas/RECON-2026-08-22.md`, section "City of Welland — resolved 2026-08-22", states: "The Hub feed carries 172 datasets against CKAN's 44". The same page's municipality table prints Welland as 172 (Hub) / 44 (CKAN).

# Backlog line that the ledger does not repeat

`niagara-atlas/BACKLOG.md` still contains this sentence: "Hamilton: 90 candidates verified 2026-08-23 (1,349,254 features), none yet fetched".

The ledger status block, regenerated 2026-08-23, records Hamilton in the selection line as 89 of 90 (all but #290). The ledger header says the ledger is the authoritative record of the merged collection. This draft does not re-fetch Hamilton and does not delete the backlog sentence. Hamilton stays outside `region:heavymap`.

# What was not done

- No layer was fetched.
- The gitignored cache was not inventoried.
- The 32 roster rows were not checked one by one against live portals.
- The Welland 172 and 44 figures were not re-counted against a live feed on 2026-10-03. They are the recon file's figures.
- No business name from a join was copied.
