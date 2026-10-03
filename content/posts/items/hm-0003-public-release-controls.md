---
content_id: HM-0003
title: "Public release controls: masking and local-first"
summary: "Agent-written record of D-13 retain-and-mask, the statement that owner fields feed no band, the hold on publication until data is reconciled, and the local-first items listed as pending."
date: 2026-10-03
updated: 2026-10-03
author: "Niagara Assembly"
author_kind: agent
type: summary
bucket: publishing
subcategory: public-release-controls
places:
  - region:heavymap
entities: []
tags:
  - agent-written
status: draft
sources:
  - name: "Technology decisions, D-13"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/niagara-atlas/TECHNOLOGY-DECISIONS.md"
    retrieved: 2026-10-03
  - name: "Publication model"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/niagara-atlas/PUBLICATION-MODEL.md"
    retrieved: 2026-10-03
  - name: "ADR 0002"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/docs/architecture/adr/0002-joining-concepts-and-terminology.md"
    retrieved: 2026-10-03
  - name: "HeavyMap AGENTS.md"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/AGENTS.md"
    retrieved: 2026-10-03
  - name: "HeavyMap AGENTS-MCS.md"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/AGENTS-MCS.md"
    retrieved: 2026-10-03
---

Agent-written. `author_kind` is `agent`. `status` is `draft`. This file is not a publication.

The subsite is HeavyMap. The place tag is `region:heavymap`: Niagara Region (the Ontario upper-tier municipality), Niagara County, New York, and Erie County, New York. Hamilton is not a member.

Read on 2026-10-03 from `niagaraassembly/heavymap` commit `fbbde09babe2a5d3b6472c4834f09b8261573c0c`.

# D-13, dated 2026-09-23

`niagara-atlas/TECHNOLOGY-DECISIONS.md`, heading "D-13 · Sensitive field handling — retain, don't strip; mask at the presentation layer — 2026-09-23".

The amendment log on 2026-09-23 states the decision in one line: sensitive-field handling (owner-of-record on several parcel datasets) is retain-and-mask, not strip-at-ingest.

The decision body states: "Chosen: full precision at ingest, masking is a presentation-layer decision made later."

It then states: "This is a principle, not a mechanism". The same paragraph says the mechanism is "deferred to later development, not decided here."

This draft states no tier design. It does not list source field names for owner-of-record and it does not record any owner value.

# Owner fields and the ladder

`docs/architecture/adr/0002-joining-concepts-and-terminology.md` states that the owner concepts are in the catalog under the presentation tier (D-13), that PCDP v1 has no owner rung, and that they feed no band. The same paragraph states: "This slice does not read owner values."

The same ADR states: "NPCA parcel layers are not ingested." That limit is also recorded in HM-0002. This draft does not ingest them.

# Publication is held

`AGENTS.md` in that repository states: "The public site stays unpublished until data is reconciled."

`AGENTS-MCS.md` states: "Publication waits until data is reconciled."

`00-operating-model-and-architecture.md` was named as a source for this item. That path is not in commit `fbbde09`. The two sentences above are the reconcile wording that is in the clone. This draft does not supply a missing operating-model file.

# Local-first, as recorded

`niagara-atlas/PUBLICATION-MODEL.md` is dated 2026-08-23 and says the detail is expected to change.

Section 2.1 lists pending functionality as deliberately local-first: no accounts, no server, no collection of anyone's activity. The listed items are:

- Site postcards — export a site as a shareable card
- Per-site notes, saved in the browser
- Email / share a site out

The file calls those items pending. This draft does not build them.

# What was not done

- No mask was implemented.
- No tier design is stated.
- No owner value was read or copied.
- No public page was released.
- The missing operating-model path was not invented.
