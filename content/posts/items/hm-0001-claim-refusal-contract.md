---
content_id: HM-0001
title: "Claim and refusal contract, as specified"
summary: "Agent-written record of the HeavyMap claim and refusal contract: four evidence grades, three refusal codes, six join methods, and the stamp fields. The public subsite scaffold still says the scale and stamp format are undefined."
date: 2026-10-03
updated: 2026-10-03
author: "Niagara Assembly"
author_kind: agent
type: explainer
bucket: claims-and-refusals
places:
  - region:heavymap
entities: []
tags:
  - agent-written
status: draft
sources:
  - name: "Claim and refusal contract"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/docs/architecture/claim-refusal-contract.md"
    retrieved: 2026-10-03
  - name: "PCDP vocabulary"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/docs/architecture/vocab/pcdp.vocab.json"
    retrieved: 2026-10-03
  - name: "PCDP vocabulary README"
    locator: "https://github.com/niagaraassembly/heavymap/blob/fbbde09babe2a5d3b6472c4834f09b8261573c0c/docs/architecture/vocab/README.md"
    retrieved: 2026-10-03
  - name: "HeavyMap subsite scaffold, claims and refusals"
    locator: "https://github.com/niagaraassembly/site/blob/master/content/subsites/heavymap.json"
    retrieved: 2026-10-03
---

Agent-written. `author_kind` is `agent`. `status` is `draft`. This file is not a publication.

The subsite is HeavyMap. The place tag is `region:heavymap`. Its members are Niagara Region (the Ontario upper-tier municipality), Niagara County, New York, and Erie County, New York. Hamilton is not a member. Monroe County is not a member. Niagara Region is not the name of the subsite.

Sources were read from `niagaraassembly/heavymap` commit `fbbde09babe2a5d3b6472c4834f09b8261573c0c` on 2026-10-03.

# What the contract specifies

`docs/architecture/claim-refusal-contract.md` states the rule for anything the ladder says about a spine unit. A presentation may assert a fact only with an evidence grade and a source stamp. Where it cannot assert, it records a refusal. The contract states that silence is not a value.

## Evidence grades

Every filled value has one grade. The contract's table, and the same four tokens in `docs/architecture/vocab/pcdp.vocab.json` (`normative.evidence_grades`):

| Grade | Meaning in the contract |
|---|---|
| `observed` | Copied from a source and normalised. Not interpreted. |
| `joined` | An observed value placed on this spine key by a named join method. The method is part of the stamp. |
| `derived` | Computed from named inputs by a named method. A reading, not a new observation. |
| `refused` | No assertion. A reason code is required. |

The contract states that `joined` is not more true than `observed`. It records an extra step that can be wrong.

The vocabulary README says the prose documents are the source of truth. The four grade tokens in the JSON match the four grade tokens in the contract. This draft did not find a fifth grade token in either file.

## Join methods

Carried on the stamp when the grade is `joined`. The contract says the names follow a prior-art set and that this sketch does not re-specify tolerances. Six tokens, also the six tokens in `normative.join_methods`:

| Method | Reader takeaway in the contract |
|---|---|
| `identifier` | The source's own id matched. |
| `normalized_address` | Address text matched after normalisation. Some rows of that table will have failed. |
| `point_in_polygon` | A point of this unit fell inside a published polygon. |
| `containment` | Geometry of this unit sits inside the source geometry. |
| `proximity` | Nearest feature under a stated distance. The distance is not access. |
| `overlap` | Area overlap above a stated threshold. |

## Refusal reasons

The contract says a refusal uses exactly one of three reasons. `pcdp.vocab.json` sets `normative.refusal_reasons.exactly_one` to `true` and lists the same three tokens.

| Reason | Use it when, in the contract |
|---|---|
| `not_in_coverage` | The layer, jurisdiction, or vintage is outside what v1 holds, or the responsible publisher does not release that object. |
| `not_licensed` | A source exists and HeavyMap is not allowed to use it. Ontario assessment via MPAC is the standing example in the contract. |
| `not_joined` | A usable source is in hand, or is expected in the joined set, and this key has no accepted join yet. |

Precedence, as written in the contract:

- If a layer is both unlicensed and unjoined, `not_licensed` wins.
- If a layer was never in the v1 set, `not_in_coverage` wins.

This draft does not apply any of the three codes to a dataset.

## Source stamp

The contract calls a stamp the smallest set of fields that lets someone else find the same record. Fields named in the contract table, and the same field names in `normative.source_stamp_fields`:

- `source_name` — required
- `publisher` — required
- `licence` — required. If the refusal is `not_licensed`, the stamp names the product that was not used.
- `original_id` — required when the source has one
- `retrieved_on` — required for anything HeavyMap holds. The date the file was obtained.
- `observation_on` — required. The date the source's fact refers to.
- `join_method` — required when the grade is `joined`
- `inputs` and `method` — required when the grade is `derived`
- `note` — when a trap matters

The contract says the original published value survives next to any normalised one.

## Register words, quoted as the contract's own rule

The contract lists words that may appear only as a quotation of a register, with grade `observed` or `joined` and a stamp:

- "vacant"
- "empty"
- "available"
- "closed"
- "departed"

The contract's next sentence is: "Without that quotation they are forbidden, including as friendly summaries of a refusal."

`pcdp.vocab.json` stores the same five strings under `normative.register_quotation_only.words`. This draft quotes that list as the contract's rule. It does not apply the words to a place, a layer, or a business.

## Scaffold text on this site

`content/subsites/heavymap.json`, section `claims-and-refusals`, says the scaffold does not define a scale and does not define a stamp format. It names the three refusal codes as names only, and says they are not applied to a dataset on that page.

The contract file does specify the four grades and the stamp fields above. The scaffold file does not adopt that text.

Replacing the scaffold wording with the contract table is not done in this draft. That change needs Morgen's approval. This file stays `status: draft`.

# What was not done

- No code was applied to a dataset.
- No tolerance was added for a join method.
- No owner value was read. The contract says owner name is not a v1 ladder object and that there is no fourth refusal code for it.
- No figure in this file was computed from a layer. The tokens are copied from the two source files.
