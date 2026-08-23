# Niagara Assembly — Atlas Analysis Engine Design

- Date: 2026-08-23
- Status: design approved in conversation; implementation plan not yet written
- Supersedes: **§9 of `2026-08-19-niagaraassembly-atlas-design.md`** (see §1.1)
- Lives at: `atlas/` in this repo

---

## 1. What this is

The analysis engine for the Atlas: the thing that turns 261 verified source
layers into statements about where old industrial fabric is under-used, where
it is changing, and where we simply do not know.

It answers three questions separately and never merges them:

1. **Under-occupancy** — is this land carrying less activity than its size implies?
2. **Transition** — has something changed here recently?
3. **Evidence** — how much do we actually know about this place?

Alongside them it carries **dormancy** (§5.4) — not a fourth score but a sparse,
cited flag, present only where a record actually says something. It is `null`
for almost every unit, and `null` means *no evidence recorded*, never *active*.

### 1.1 Relationship to the 2026-08-19 spec

That spec's §9 places **"derived scoring or opportunity indices"** out of scope,
and §8 states the defamation guard that motivates it: the map may report that a
polygon is tagged brownfield; it may not conclude that a site is vacant, that a
named business is underperforming, or that an owner is neglecting a property.

**This spec reverses the scope decision and keeps the guard.** The reversal is
deliberate and was taken in conversation on 2026-08-23. The guard is not
weakened — it is the constraint the whole design is built around, and five
structural choices exist specifically to honour it:

| Guard | Structural answer |
|---|---|
| No claim a site is vacant | No score is named "vacancy". Under-occupancy is a **ratio of observed quantities**, and its signal list shows every input. Hamilton's #221 is the only vacancy claim in the system and it is **quoted from a municipal register**, not inferred. |
| No claim about a named business | Business names never enter a score. They are attributes of a unit, not evidence against an owner. |
| No implication a site is for sale | Nothing in the data says this and nothing in the output implies it. The word "available" does not appear in any label. |
| Inference must not masquerade as observation | Three separate scores, never composited. `evidence` qualifies the other two and is rendered alongside them, never added to them. |
| Precise vacancy detail has misuse value | Two-tier emission with k-anonymity suppression (§6). |

**One further concession to the guard:** under-occupancy is computed from the
**upper** bound of the employment range (§5.1), so the engine systematically
understates under-use. It is designed to be unflattering to its own thesis.

If the guard and the engine ever conflict in practice, the guard wins and the
finding is not published.

---

## 2. Decisions taken

Locked in conversation, 2026-08-23:

| # | Decision |
|---|---|
| D1 | **Tiered audience.** Public sees regional pattern; members see parcel detail. |
| D2 | **Three sub-scores, reported separately.** No composite, ever. |
| D3 | **Parcel-primary unit with graceful degradation** to footprint, then address point. Address points are the universal join anchor (§6.1). |
| D4 | **Tier boundary built into the pipeline; public artefact only is deployed.** No auth infrastructure now. |
| D5 | **Hybrid computation** — spatial joins at build time, scoring arithmetic at runtime. |
| D6 | **k = 3** minimum units per published public cell. |
| D7 | **Employment upper bound** used for under-occupancy. |
| D8 | **Weights are versioned, published data** with a PR-based contribution path. |
| D10 | **The site dossier is a first-class output and a verification stage** (§7) — it falsified a live layer on first use. A contradicted finding is **shown as a contradiction**, never suppressed (§7.3–7.4). |
| D9 | **Dormancy is a sparse cited flag, not a fourth score** — the direct vacancy evidence measured 2026-08-23 is too thin to converge on (§5.4). |

---

## 3. Architecture

The engine splits at one seam: **spatial work happens once at build time,
arithmetic happens live in the browser.**

```
scripts/.cache/{bulk,hamilton}/     261 layers · 204 fetched · 2.1M features
        │
        ▼
  normalize/       one module per publisher family (NF · StC · WEL · RGN ·
        │          NPCA · HAM · OSM · province); canonical shape + provenance
        ▼
  units.py         picks the analysis unit per area and records which rung:
        │          parcel → building footprint → NEI point cluster
        ▼
  enrich.py        the expensive part, run once: point-in-polygon vs
        │          constraints, distance-to-rail, sewer catchment, designation
        ▼
  changes.py       two-epoch diffs: NEI year↔year · NF footprints 2010↔2018 ·
        │          WEL zoning old↔current · HAM permits (see §5.2)
        ▼
  emit.py          public artefact  (250 m grid, k≥3, aggregated)
        │          member artefact  (parcel records)
        │          + display geometry, emitted SEPARATELY
        ▼
  engine/score.js  pure functions: attributes + weights → sub-scores + signals
```

**Load-bearing choices.**

*The emit stage honours the D-5 disposition* recorded per layer in
`TECHNOLOGY-DECISIONS.md` — `ship`, `simplify`, `derive`, `tile` or `link`.
Contours are `derive`: consumed at build into `elev_min_m`, `elev_max_m`,
`relief_m`, `slope_pct`, and never committed or served. Simplification of
tiling layers uses mapshaper with `keep-shapes`, and asserts output feature
count equals input.

*Display geometry is emitted separately from analysis attributes.* They have
opposite requirements — analysis wants precision, display wants smallness.
Coupling them forces a false choice between a 78 MB wetlands layer and a
useless one. Records reference geometry by `geom_ref`.

*`changes.py` is its own stage.* Change detection operates across time rather
than space, has different failure modes, and produces the most defensible
findings. It is independently testable.

*Normalizers are per-publisher-family, not per-dataset.* Matching the existing
split of `fetch_hamilton.py` / `fetch_osm.py`.

*`score.js` never sees geometry and never fetches.* It can be tested with a
literal object and no map.

---

## 4. The enriched unit record

The contract between build and runtime: a flat object of scalars and booleans.

```jsonc
{
  "id": "wel-parcel-0000", "unit_tier": "parcel",   // parcel | footprint | address "municipality": "Welland",
  "area_m2": 57783, "geom_ref": "wel/0000",

  "designation": "employment", "zoning_code": "G1",
  "zoning_desc": "General Industrial", "in_urban_area": true, "in_psez": false,

  "businesses_n": 3,
  "employees_lo": 15, "employees_hi": 297, "employees_basis": "band",
  "indoor_gfa_m2": 4180, "naics_primary": 332, "naics_set": [332, 484],
  "building_m2": 11200, "building_n": 4,

  "c_floodplain": 0.00, "c_npca_regulated": 0.12, "c_natural_heritage": 0.00,
  "c_wetland": 0.00, "c_watercourse": 0.04, "c_archaeological": 1.00,
  "c_heritage": 0.00, "c_mto_buffer": 0.00, "c_greenbelt": 0.00,
  "c_nep": 0.00, "c_escarpment": 0.00,
  "constraint_max": 1.00, "constraint_n": 3,

  "sewer_catchment": "SPS-14", "dist_rail_m": 340,
  "dist_regional_road_m": 88, "road_aadt_nearest": 12400,
  "dist_highway_m": 2100, "dist_border_m": 18400, "dist_canal_m": 610,
  "transit_400m": true, "hydrant_150m": true, "water_pressure_district": null,

  "nei_departed_n": 1, "nei_arrived_n": 0, "turnover_n": 2, "nei_last_year": 2022,
  "footprint_delta_m2": null, "zoning_changed": true,
  "permits_5y": 0, "demolition_permits": 0, "demolition_basis": null,
  "dev_application_open": false, "site_plan_open": true,
  "registered_vacant": false, "osm_disused": false, "osm_brownfield": false,

  "registers_n": 3,
  "has": ["parcel","zoning","designation","nei","osm","footprint"],
  "register_conflict": false,
  "as_of": {"nei": 2022, "zoning": 2017, "footprint": null, "osm": "2026-08"},
  "sources": [{"id":"welland-zoning","retrieved":"2026-08-22","licence":"OGL 2.0 (Welland)"}]
}
```

### 4.1 Five load-bearing schema decisions

**Employees is a range, never a point.** The NEI gives bands
(`"Small (5-99 Employees)"`); Welland's directory gives integers. Collapsing a
band to its midpoint manufactures precision the source does not have, and every
downstream ratio inherits it. `employees_basis` records which kind was
available (`band` | `exact` | `mixed`).

**Constraints are area fractions, not booleans.** A parcel 5% clipped by a
watercourse setback is a different proposition from one wholly inside a
regulated area. The fraction is free — the intersection is already computed.

**`as_of` is per attribute group, not per record.** A parcel's NEI observation
may be 2022, its zoning 2017, its OSM view days old. One record-level freshness
stamp would be a fiction.

**No score is stored.** The schema carries inputs only. Scores are computed at
runtime, which is what makes the weighting arguable rather than baked in.

**`has` and `registers_n` carry the coverage story** so degradation is data
rather than a UI afterthought.

---

## 5. The three sub-scores, and dormancy

Each is a pure function of `(record, weights)` emitting a **signal list** —
every point traceable to a named piece of evidence.

```js
score(record, weights) → {
  underoccupancy: { value, band, signals:[{delta, text, basis}], employees_range },
  transition:     { value, direction, signals:[...] },
  evidence:       { value, tier, registers_n, conflict, signals:[...] },
  dormancy:       null | { level, signals:[...], as_of },   // §5.4 — sparse
  weights_version: "v1"
}
```

### 5.1 Under-occupancy

Ratios of what is present against what could be: `building_m2 / area_m2`,
`area_m2 / employees`, `indoor_gfa_m2 / employees`, weighted by absolute scale.
Activity evidence — an open application, a recent permit, a named operator —
**subtracts**.

**Computed from the employment upper bound (D7).** Using the low end would
maximise apparent under-use and make the engine flattering to its own thesis.
The range is reported alongside.

**Returns `null` where there is no denominator.** Address-tier units (no area) and all
of Hamilton (no employment data) return null, never zero. Zero would read as
"fully used" — the exact inversion of "we do not know."

### 5.2 Transition

Departures (NEI year↔year), demolition and construction (NF footprints
2010↔2018; HAM permits), rezoning (WEL old↔current), permits and development
applications.

**Magnitude and direction are separate fields.** `direction` is
`contracting | expanding | mixed`; `value` is how much changed. A departure
plus an open development application is not the same story as a departure into
silence.

**Hamilton's demolition signal is not uniform across time.** Permits from 2017
(#223) carry a type-coded prefix — `DP` = Demolition Permit, 3,007 records at
97.2% precision. Permits 2008–2016 (#222) use year prefixes with no type code,
so demolitions there can only be keyword-matched (6,068 hits), and keyword
matching cannot separate "demolished" from "demolished and replaced".
`demolition_basis` carries `typed` | `keyword` | `null` per record, and the UI
must not present 2008–2026 as one uniform series.

### 5.3 Evidence

`registers_n`, `unit_tier`, staleness from `as_of`, and `register_conflict`.

**Never adds to the other two.** It qualifies them. High under-occupancy with
low evidence is a lead, not a finding.

`register_conflict` is the gap-finder: it fires when a register says occupied
and OSM is blank, or when two registers disagree about the same ground. Welland
is the measurable case — NEI records 1,299 businesses, the city directory 923.

### 5.4 Dormancy — a sparse flag, not a score

**Added 2026-08-23 after measuring the available evidence.** The intent was a
convergence score: a register says a business left, nothing replaced it, OSM
shows no activity, no permit since. The data will not carry that shape.

**Measured, 2026-08-23:**

| Signal | Count | Coverage |
|---|---:|---|
| OSM `brownfield` | 316 | region-wide |
| OSM `disused` (recorded) | 71 | region-wide |
| NEI departures 2019→2022, all sectors | **121** | Niagara Region |
| ↳ industrial sector only | **15** | Niagara Region |
| Hamilton demolition permits (typed `DP`) | 3,007 | Hamilton |
| Hamilton registered vacant (#221) | 84 | Hamilton |

121 departures from 12,016 businesses over three years. A rule requiring three
or four signals to agree on one parcel would return approximately nothing.

**Therefore dormancy is not scored for every unit.** It is a flag computed only
where at least one qualifying observation exists, carrying the citation for
each. `dormancy: null` is the normal case and means *no dormancy evidence
recorded here* — never *this site is active*.

```js
dormancy: null | {
  level: "recorded" | "corroborated" | "single-signal",
  signals: [{source_id, observed_on, text}],
  as_of: "2026-08-23"
}
```

- **`recorded`** — a register states it. Only Hamilton #221 qualifies today (84
  buildings). Rendered as a cited fact, never as a score.
- **`corroborated`** — two or more independent observations agree (e.g. an NEI
  departure with no arrival *and* an OSM `disused` tag).
- **`single-signal`** — one observation. Displayed with the observation named,
  because one source saying something is a lead, not a finding.

**Labels.** The public string is *"records suggest inactivity"* with the
evidence enumerated beneath. The words *vacant*, *empty* and *available* are
reserved for `recorded`, where a register supplies them, and are then quoted
with attribution. This is the §1.1 guard applied at the level of wording.

**Validation.** Hamilton's 84 registered-vacant buildings are the test set.
Dormancy is aimed squarely at what that register measures, so unlike
under-occupancy it is a fair test: the flag should fire on them.

### 5.5 Premises turnover — a signal found while measuring

`nei_id` keys a **premises record, not a business**. Across 2019→2022, 95.4% of
ids keep the same business name but **544 change name under the same id** —
4.5× more common than departure. A premises turning over is a different
phenomenon from one emptying, and it is far better evidenced.

Carried as `turnover_n` on the record and fed to **transition** (§5.2), not to
dormancy. Noted here because it was found while establishing that dormancy
could not be a convergence score, and it is the more abundant signal.

### 5.6 NEI cross-year normalization

The NEI schema drifts across survey years and cross-year comparison silently
returns **zero** unless normalized:

| Year | Id field | Employee field |
|---|---|---|
| 2017 | `NEI_ID` | `SizeRange_Employees` |
| 2018 | `NEI_ID` | `SizeRange_Employees` |
| 2019 | `NEI_ID` | `EmployeeSizeRange` |
| 2022 | `nei_id` | `sizerangeemployees` |

`normalize/nei.py` lower-cases and strips underscores from every key before
mapping. A test asserts that each year-pair yields a non-zero intersection —
silent zero is the failure mode this guards against, and it is the one that
already occurred during design.

### 5.7 Where aggressiveness lives

Dormancy is deliberately sparse; **under-occupancy is the signal with volume**
(~79,000 parcels). Tuning sensitivity therefore means adjusting under-occupancy
thresholds and the D7 employment-bound convention — both rows in
`weights/vN.json`, not code. Raising sensitivity is a weight change with a
published version and a posted score delta (§8), so the history shows what was
changed and what it moved.

### 5.8 No composite

The output type has three score fields and no fourth. Dormancy (§5.4) is a
flag with citations, not a score, and is never summed with them. A single number would be
the most-requested feature and the most dishonest: it would average a physical
observation, a temporal observation and an epistemic one into a quantity that
means nothing.

---

## 6. Coverage, degradation and the tier split

### 6.1 The ladder

**Corrected 2026-08-23.** An earlier draft had the bottom rung as
`point_cluster`, on the assumption that the nine smaller Niagara Region municipalities
had no geometry of their own. They do: **Niagara Region publishes Address
Points (#43) covering all twelve municipalities — 208,004 points**, and
Hamilton publishes 273,535 (#220). Every square metre of the study area has
address-level geometry.

**Two different roles, previously conflated.**

- **Join anchor — the address point.** Universal, 481,539 across both regions.
  This is what address-bearing tables geocode *to*: Hamilton's 194k permits,
  the vacant registry, the licence registers, Welland's business directory.
- **Analysis unit — the thing a score attaches to.** Parcel where it exists,
  else building footprint, else the address point itself.

Records land on the anchor and roll *up* to the unit. Where no parcel or
footprint exists the anchor is also the unit, and area-based scores are null
because a point has no area — not because the place is unknown.

| `unit_tier` | Where | Count | What can be said |
|---|---|---:|---|
| `parcel` | Niagara Falls, St. Catharines | 79,369 | ratios against real parcel area; tenure boundary |
| `footprint` | Welland, Hamilton, Niagara Falls | 282,567 | ratios against building extent; no tenure |
| `address` | **everywhere**, incl. the six municipalities that publish nothing | 481,539 | presence, change, constraint containment, distance — **not** area ratios |

The six non-publishing municipalities hold **51,778 address points** between
them (Thorold 12,136 · Grimsby 12,013 · Port Colborne 10,200 · Pelham 8,148 ·
West Lincoln 5,801 · Wainfleet 3,480). They are thinner-evidenced, not absent —
and they still receive transition, dormancy, evidence and every constraint and
distance attribute. Only the area-denominated scores go null.

**Coverage is a published layer**, not a footnote — shaded by evidence tier.
Six municipalities publishing nothing is a finding about Niagara Region's data
landscape in its own right. This also discharges the open defect carried
forward as §10.5 of the 2026-08-19 spec.

### 6.2 The asymmetry runs both ways

Niagara Region has business data Hamilton lacks (98,065 NEI points, no Hamilton
equivalent — #271 is a 10-row summary table and does **not** close the gap).
Hamilton has servicing data Niagara Region lacks (13,947 sewer catchments against 119;
water pressure districts; 2,350 traffic counts). Hamilton also holds the only
**recorded** vacancy in the system (#221, 84 records).

### 6.3 Emission

```
member artefact   parcel records, all attributes, business counts
                  → built, NOT deployed (D4)
public artefact   250 m grid cells in UTM 17N, aggregated, no parcel ids,
                  no business names → deployed to GitHub Pages
```

**k-anonymity suppression (D6).** A cell publishes only if it contains ≥3
units. Below that it emits as `suppressed` and renders as *"too few sites to
publish"* — visibly withheld rather than blank, because a blank cell reads as
"no industry here".

Grid aggregation alone is insufficient: a 250 m cell in a dense industrial park
holds a dozen parcels, but the same cell in Wainfleet holds one, and
aggregating it protects nothing.

---

## 7. The site dossier

**Added 2026-08-23**, after testing the idea against real data. The three
scores answer *population* questions — how does this place compare across the
region. The dossier answers the *site* question: **when someone looks at one
place, is their takeaway rich?** Scarcity of evidence does not diminish it.
Fifteen well-documented sites is a useful output.

### 7.0 The dossier is for every parcel, not only the flagged ones

**Amended 2026-08-23 on the project owner's direction.** An earlier draft put
an assertion at the head and made context subordinate to it. That is backwards.
Most parcels carry **no** assertion — nothing departed, nothing is dormant —
and the context is still the point.

**The dossier's job is to bring a piece of land's story alive.** A working,
fully-occupied industrial site has a story: what it is zoned, what it was zoned
before, what sits on it, how big, how reached, what constrains it, who its
neighbours are, when it was built and what stood there before. None of that
requires anything to be wrong with the place.

So the structure inverts:

- **Context is always present.** Every unit gets every band its tier can fill.
- **An assertion is one optional band**, present only when a record says
  something specific — a departure, a registered vacancy, a demolition.
- **The scores are three more readings**, not the headline.

An atlas that only lights up where it suspects abandonment is a decline map.
The subject is the physical industrial economy — most of which is *working* —
and the dossier has to serve a reader asking "what is this place?" as well as
one asking "what went wrong here?"

### 7.0.1 Story includes time

The data supports real temporal depth, and a site's story should use it:

| Span | Source |
|---|---|
| 1934 · 1954 · 1965 · 1972 | Brock air photo mosaics (#106–109) |
| 1910s–1970s | Brock topographic series (#111) |
| 2006 · 2013 · 2018 | Niagara Falls ortho imagery (#113) |
| 2008 → present | Hamilton permits (#222–223), 194,466 records |
| 2010 · 2018 | Niagara Falls building footprints (#40, #41) |
| pre-2017 · current | Welland zoning (#20, #21) |
| 2017 · 2018 · 2019 · 2022 | NEI editions |
| per business | NEI `yearopen` |

A parcel that was open field in 1934, built on by 1965, rezoned I2 → L1 in
2017 and now holds three businesses is a **ninety-year story** assembled from
sources we already hold. That is the dossier working at full strength, and it
has nothing to do with dormancy.

### 7.1 Structure — context always, assertion when there is one

```
ASSERTION   optional — present only when a record says something specific

REGULATORY  zoning now · zoning was · Official Plan designation · CIP areas
PHYSICAL    parcel area · building footprint · coverage · footprint change
CONSTRAINT  the c_* fractions, named, with the authority behind each
ACCESS      rail · regional road + AADT · highway · border · canal · transit
NEIGHBOURS  businesses within 500 m, sector mix, cluster or isolated
CHANGE      departures · arrivals · turnover · permits · applications
HISTORY     imagery epochs · footprint change · rezoning · years opened
EVIDENCE    which registers cover this, how stale, what disagrees
```

Each band is a block that makes one point and cites the layer it came from.
The reader who wants depth follows the citation; the reader who does not is not
made to wade.

### 7.2 It is a verification mechanism, not only a presentation

The first dossier assembled — `Hopkins Steel Works, 2 Broadway, Welland`, from
`data/niagara-departures.geojson` — produced this:

```
ASSERTION   Hopkins Steel Works — recorded 2018, absent by 2022
REGULATORY  zoning now L1 Light Industrial · zoning was I2
            OP Schedule B Light Industrial · CIP area: Brownfield CIA
PHYSICAL    building present · nearest building 17 m
ACCESS      rail 513 m · nearest site plan 247 m
NEIGHBOURS  18 businesses within 500 m, 3 manufacturing:
              Hopkins Steel Works        ← the subject of the assertion
              National Group
              Hydac Corporation
```

**The neighbours band contained the business the assertion said had left.** NEI
id 8130 is present in 2017, 2018, 2019 *and* 2022 at that address. Checking all
68 claimed departures: 18 definitively false at address level, 60 of 68 still
present by name.

**A regional score would have counted 68 departures and moved on.** Assembling
the context around one assertion falsified it in a single step. See
`atlas/BACKLOG.md` for the defect and `atlas/logs/2026-08-23.md` §06 for the
raw trace.

### 7.3 Therefore: contradiction checks are a build-time stage

The dossier's verifying property is made a pipeline stage rather than a lucky
accident. Every assertion is checked against the bands that could refute it:

| Assertion | Refuted by |
|---|---|
| business departed | that business present in any **later** NEI edition |
| site dormant | an open permit, application or site plan; a current licence |
| building demolished | a footprint present in a later epoch at that location |
| land under-occupied | recent permit activity, or employment above band |

Each assertion carries a resulting state:

```
claim_state: "supported" | "contested" | "refuted"
```

**A failed check does not delete the finding. It changes what is shown.**
Suppressing a contradicted assertion would hide the most informative thing on
the card — that two records disagree about the same ground — and would leave
the reader trusting a silence they cannot inspect.

| State | What the card shows |
|---|---|
| `supported` | the assertion, its source and date, and the corroborating bands |
| `contested` | **both records, side by side**, each with source and date, and what the disagreement turns on |
| `refuted` | **the discrepancy**, stated as a discrepancy — never the claim as fact |

The Hopkins card under this model does not read *"Hopkins Steel Works
departed"*, and it does not read blank. It reads:

> **Records disagree about this site.**
> The derived departures layer records *Hopkins Steel Works, last seen 2018,
> gone by 2022*.
> The Niagara Employment Inventory lists *Hopkins Steel Works* at 2 Broadway in
> its **2017, 2018, 2019 and 2022** editions.
> A derived layer and a source register conflict; the register is the stronger
> evidence.

That is more useful than either the false claim or its absence, and it is what
the reader needs in order to reach their own conclusion.

### 7.4 The line the guard actually draws

The defamation guard (§1.1) does not prohibit publishing a contradiction. It
prohibits **asserting as fact** something about a named business that the
evidence does not support.

- **Not published:** *"Hopkins Steel Works ceased operating at 2 Broadway."*
  An unqualified claim about a named business, contradicted by the register.
- **Published:** the two records, both cited and dated, and the discrepancy
  between them. Every word of that is true and every part is checkable.

So what a failing check blocks is the **unqualified assertion**, not the
information. The engine may always show what each source says. It may not
adopt one source's claim as its own conclusion when another refutes it.

A **computed claim** — the engine's own best reading — may be offered
alongside, clearly labelled as computed, with its inputs listed and its
confidence stated. It is never the only thing shown, and it never replaces the
underlying records. The reader is given the evidence and the engine's opinion,
and can disagree with the second while keeping the first.

This is where the regression test named in §9.2 lives: the test asserts that no
feature is published in the `supported` state while a later register
contradicts it — not that contradicted features are absent.

### 7.5 What each unit tier can produce

| Band | `parcel` | `footprint` | `address` |
|---|---|---|---|
| context bands (regulatory, constraint, access, neighbours, history) | ✅ | ✅ | ✅ |
| assertion · evidence · change | ✅ | ✅ | ✅ |
| constraint · access · neighbours | ✅ | ✅ | ✅ |
| physical (area, coverage) | ✅ | partial — no tenure | ✗ |

Only the area-dependent band degrades. An address-tier site in Wainfleet still
gets a dossier — assertion, constraints, access, neighbours, change — with the
physical band marked unavailable rather than blank.

### 7.6 Dependencies

Assembly needs the geospatial toolchain in `atlas/ENVIRONMENT.md` (shapely for
containment and nearest-neighbour, pyproj for distances in UTM 17N). The
prototype used pure-Python ray casting, which was adequate for one point and is
not for a build.

## 8. Transparency and weight governance

**Weights are versioned data.** `engine/weights/v1.json` — every signal a row
with `id`, `delta`, `label`, `input_field`, `rationale`, `evidence_class`
(`observed` | `inferred`). Every score carries `weights_version`; a score
computed under v1 is not comparable to one under v2, and a chart that silently
mixes them is a bug that looks like a trend.

**Docs are generated from the weight table, not maintained alongside it.**
A generator renders `weights/vN.json` into the methodology page. Hand-written
docs describing a live table drift — this project has already seen exactly that
with the `open.niagararegion.ca` 404 and the "Businesses by Employee Count"
lead.

**Contribution is a PR against the weight file.** CI validates the schema, runs
the engine over the golden fixture set, and posts **score deltas**: *"changing
`abandoned` from +60 to +40 moves 1,240 units; these 12 leave the top 100."*
A weight change is reviewable on its effects, not its diff.

Publishing weight *versions* with their deltas is also what keeps tuning
honest — the history is public, so adjusting the formula until it says
something convenient is visible.

**In the interface:** a "why this score" panel per unit (the signal list), a
generated methodology page, and the coverage layer.

---

## 9. Failure modes and testing

### 9.1 What makes this engine lie

| Failure | Mitigation |
|---|---|
| **Geocoding loss reading as absence.** Hamilton's best evidence is address-only (194k permits, #221, licence registers). Unreported match failure reads as "nothing happened here". | Match rate reported per table and municipality; unmatched counts carried as a declared deficit; a **floor that fails the build**. |
| **Coverage mistaken for absence.** | Null renders as null. Never zero. |
| **Projection error in area maths.** WGS84 area is wrong by a latitude-dependent factor — and wrong *plausibly*. | All area work in **UTM 17N**, asserted at the pipeline boundary. |
| **Double-counted employment.** A business in both NEI and the Welland directory inflates the denominator and suppresses under-occupancy. | Dedup with a **reported** collision rate. |
| **Stale registers read as current.** | `as_of` per attribute group; a 2016 NEI row is a 2016 observation. |
| **Weight drift.** | `weights_version` on every score. |

### 9.2 Tests

`score.js` being pure is the whole testing story: literal record in, scores
out, no map, no fetch.

**Calibration tests — the two sets the reconnaissance found:**

- **Welland** — 923 businesses with exact `FullTime` counts against NEI bands
  for the same ground. Measures how wrong a band midpoint would have been,
  which is what justifies the range-not-point decision (§4.1).
- **Hamilton #221** — 84 buildings a municipality has *recorded* as vacant.
  Under-occupancy should rank them highly. **This test can fail, and that is
  its value**: if the inference does not surface known-vacant buildings, the
  inference is wrong, and we would rather learn that in CI than in public.

**Cross-year normalization test.** Each NEI year-pair must yield a non-zero
intersection. Silent zero from schema drift is the failure mode that already
occurred once during design (§5.6).

**Also:** golden fixtures (a frozen record sample committed to the repo, so a
weight change shows as a reviewable diff — this is what the PR workflow posts);
coverage assertions (Wainfleet must never produce a parcel-tier unit, and must
produce address-tier units — 3,480 of them);
determinism (same inputs → same output hash).

---

## 10. Data position

Verified and held locally as of 2026-08-23 — see `atlas/INGESTION-LEDGER.md`.

| | Niagara Region | Hamilton | Total |
|---|---:|---:|---:|
| Candidates selected | 125 of 126 | 89 of 90 | 214 |
| Source layers | 171 | 90 | 261 |
| Verified reachable | 149 | 89 | 238 |
| Fetched | 143 | 88 | **231** |
| Features | 1,065,376 | 1,349,254 | **2,414,630** |
| Cache size | 2.0 GB | 2.8 GB | **4.8 GB** |

Receipts reconciled 2026-08-23 after the first Hamilton run was killed at
4.7 GB RSS (the fetcher accumulated pages in memory; it now streams to disk,
and the skip path stream-counts rather than parsing a 2.2 GB file to report a
number). Three fetch failures remain: Brock #106 and #111 behind a Cloudflare
bot challenge, and Hamilton #280 returning a publisher-side HTTP 500.

The single largest layer is Hamilton **#260 Contour Lines — 221,518 polylines,
2,222 MB**, 46% of the entire cache. Terrain at 1 m interval is display-and-
simplify material, not analysis input.

Reference documents in `atlas/`:

| | |
|---|---|
| `GLOSSARY.md` | **binding** — Niagara Region vs Peninsula vs study area |
| `ENVIRONMENT.md` | the toolchain: shapely 2.1.2, pyproj 3.7.2, pyogrio, orjson, rasterio, mapshaper. Installed and verified 2026-08-23 |
| `TECHNOLOGY-DECISIONS.md` | D-1…D-12, including **D-5 large-layer disposition** (`ship`/`simplify`/`derive`/`tile`/`link`) which governs what the emit stage may ship |
| `PUBLICATION-MODEL.md` | audiences and the two documentation tiers |
| `logs/` | raw findings, appended as work happens — **mandatory**, see `../CLAUDE.md` |
| `CANDIDATES.md` · `CANDIDATES-HAMILTON.md` | the numbered dataset menus |
| `SCHEMAS-HAMILTON.md` · `RECON-2026-08-22.md` · `DATA-SOURCES.md` | observed schemas and reconnaissance |
| `INGESTION-LEDGER.md` · `sources/manifest*.json` | retrieval state |

**Nothing is ingested into `data/` yet.** These are local working copies.

---

## 11. Constraints carried over

From `2026-08-19-niagaraassembly-atlas-design.md` §8 and `DATA-SOURCES.md`,
unchanged and not negotiable:

- **The defamation guard** (§1.1). If it conflicts with a finding, the guard wins.
- **ODbL share-alike.** OSM binds any derived layer mixing sources. This is an
  argument for keeping OSM-derived and municipal-derived signals *separable* in
  the scoring output rather than fused — which the signal list already does.
- **Coverage asymmetry must be shown, not smoothed.**
- **The epistemic rules.** Never fabricate; a gap is shown as a gap. Never infer
  a business is operating from an old dataset. Distinguish observation from
  inference, current from historical. Every layer declares freshness. Derived
  scores are analytical indicators, not economic truth.

---

## 12. Out of scope

- Any composite or single "opportunity" score (§5.4)
- Any label implying a site is available, for sale, or its owner receptive
- Live Overpass querying — the reference implementation's model, rejected in
  conversation as unviable at this data volume
- Auth infrastructure for the member tier (D4)
- Ingestion into `data/` and the Leaflet layer wiring — a separate spec
- Entity resolution into cross-source "site" entities — considered and rejected
  as the most error-prone part of the build; revisit only with cause

---

## 13. Open items

1. **Grid size.** 250 m assumed; not tested against how it behaves in dense
   industrial parks versus rural townships.
2. **Intersection geocoding.** #245, #252, #285 are locatable only by
   cross-street, needing a road-network join against #246 rather than an
   address lookup. Whether #252 (134,136 collision records) earns that effort
   is undecided — its industrial relevance is indirect.
3. **Brock historical imagery** (#106–112) sits behind a Cloudflare bot
   challenge. Not worked around. Needs a browser or a request to Brock Map
   Library.
4. **Welland Business Licences** (#80) and **Hamilton #280** are blocked on
   publisher-side outages.
5. **Hamilton #290** (Targeted Terrestrial Natural Heritage System) is
   catalogued as a document; needs a targeted look.
6. **NPCA "Assessment Parcels"** licence is unverified. MPAC bulk data is a
   paid dead end; a conservation authority republishing assessment-derived
   parcels may be doing so under terms that do not extend to us. Do not ingest
   until established.
7. **Burlington and Halton** remain the weakest part of the source base.
   Burlington returns HTTP 403; Halton has never been probed.
8. **Dormancy is thinly evidenced outside Hamilton.** 121 NEI departures and 71
   OSM `disused` tags region-wide. If dormancy is to matter at scale it needs a
   new source, not a cleverer rule — the curated submission pipeline in §6 of
   the 2026-08-19 spec is the obvious candidate, and this measurement is
   probably why that spec proposed human curation in the first place.
9. **Premises turnover (§5.5) is unexplored.** 544 name changes under a stable
   id, 4.5× more common than departure, and nobody has looked at what they are.
