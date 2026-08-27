# Atlas Enrichment — Design

- Date: 2026-08-27
- Status: design approved in conversation; implementation plan not yet written
- Plan 2 of 6. Predecessor: `2026-08-23-atlas-engine-design.md` (the engine spec, binding)
- Preceded by: `atlas/RECON-SPIKE-2026-08-27.md`

---

## 1. What this is

The enrichment stage: it takes the 445,075 units built by plan 1 and attaches
the attributes that describe **what a site is encumbered by** and **what it can
reach**. It fills the `c_*` and access groups of engine spec §4.

It does not score. It does not detect change. It produces the inputs those
stages consume.

### 1.1 What this stage learned before it was designed

Six of the attributes named in engine spec §4 measure the wrong thing. Each was
checked against real data during design, and each failed the same way: **a
metric that computes cleanly, passes any test, and answers a question nobody
asked.** That is the identical failure that produced 64 false departure claims
in plan 1.

The corrections are §4 below and they are the substance of this design.

---

## 2. Decisions taken

| # | Decision |
|---|---|
| E1 | **Scope: constraints + access.** Servicing capacity is included because it turned out to be recoverable (§5). Occupancy aggregation and change detection belong to plan 3. |
| E2 | **Config-shaped, Ontario configs only.** Source descriptors, field mappings, CRS and municipality allow-lists live in configuration from the first commit; only Ontario regions are written. |
| E3 | **Two-pass spatial join** — STRtree bbox prefilter, then exact intersection on survivors (§7). |
| E4 | **5 km distance ceiling.** Beyond it, `null` — meaning *we did not look further*, not *far away*. |
| E5 | **Access is measured to access points, never to networks** (§4). |
| E6 | **A veto class exists, separate from constraints** (§6). |
| E7 | **Regulatory registers are a first-class source class** (§8). |

---

## 3. The six join methods

A region's capability is which of these it supports, not how many datasets it
publishes. Every enrichment attribute declares which method produced it.

| # | Method | Joins | Trust | Output |
|---|---|---|---|---|
| J1 | **Identifier** | record → record | strongest | exact, or absent |
| J2 | **Normalized address** | table → anchor | strong | a **measured match rate** |
| J3 | **Point-in-polygon** | unit → constraint | strong | containment, exact |
| J4 | **Containment** | footprint → parcel | strong | exact |
| J5 | **Proximity** | unit → access point | weak | a distance, always stated |
| J6 | **Geometric overlap** | polygon → polygon | weakest | a threshold, always stated |

---

## 4. Access — the correction

**The linear feature is not the access point.** Track, motorway and canal are
things you travel *along*; freight enters and leaves at discrete points. Every
original access attribute measured distance to the wrong geometry.

### 4.1 Rail

Observed in `data/osm-rail.geojson`, 4,399 features:

```
service:  rail 1,909 · spur 1,170 · yard 869 · siding 332 · crossover 119
usage:    main 1,230 · industrial 657 · branch 287 · (untagged) 2,223
```

`dist_rail_m` is replaced by **`dist_rail_served_m`** — nearest track that is
`service ∈ {spur, siding, yard}` **or** `usage ∈ {industrial, branch}`.

- `crossover` is **excluded**: junction geometry, not usable track.
- `usage = main` is **excluded** from the served measure. A train passes; you
  cannot load from it. Mainline distance may be carried separately as
  `dist_rail_main_m` because it answers a different question (nuisance, noise,
  severance) — never as access.
- **2,223 features carry no `usage` tag.** A unit reporting no rail-served track
  within 5 km may be near untagged track. `rail_tag_confidence` carries this;
  it is not permitted to become a silent zero.

### 4.2 Road

Hamilton's truck route network (1,250 features) carries `IS_TRUCK_ROUTE`,
**`RESTRICTED`** and **`TIME_OF_DAY`**.

`dist_regional_road_m` is replaced by **`dist_truck_route_m`**, with
`truck_route_restricted` and `truck_route_time_limited` alongside. A road open
to trucks only between 07:00 and 19:00 is not equivalent to an unrestricted one.

**AADT is not truck traffic.** `road_aadt_nearest` is retained but renamed
**`road_aadt_all_vehicles`** and **must carry `road_aadt_year`** — Hamilton's
2,350 counts each have a `COUNT_YEAR` and they vary widely. High AADT is also
*ambiguous* for industry: good for visibility, bad for freight egress.

**Observed corridor friction.** Hamilton publishes complaint counts on 435 truck
corridors (`NUMBER_OF_COMPLAINTS`, `FOUR_AXLE_COMPLAINTS`; Locke Street North
2,513). This is *observed* community friction, and it predicts future route
restriction. Carried as `truck_corridor_complaints`, Hamilton only.

### 4.3 Highway

**265 motorway junctions** exist in the study area (Overpass,
`highway=motorway_junction`, verified 2026-08-27).

`dist_highway_m` is replaced by **`dist_interchange_m`**. A parcel adjacent to
the QEW with no ramp for 8 km has no highway access, and the original attribute
would have scored it as prime.

### 4.4 Border

**Not all crossings take commercial traffic.** The Rainbow Bridge is
passenger-only; Queenston–Lewiston and the Peace Bridge handle freight.

`dist_border_m` is replaced by **`dist_commercial_crossing_m`**, computed only
against crossings classified as commercial. An uncategorised crossing is
excluded and recorded, never assumed commercial.

### 4.5 Water

Observed in the study area: dock/quay **7**, harbour **2**, crane/berth **9**,
pier/wharf **483** (overwhelmingly recreational shoreline docks).

`dist_canal_m` is replaced by **`dist_water_loading_m`**, computed against docks,
quays, harbours and cranes — **not the canal centreline**. The Welland Canal is a
transit corridor; ships pass through locks and do not tie up along its length.
Loading happens at Port Colborne, Port Weller and Hamilton harbour.

This attribute will be `null` for almost every unit. **That is the correct
answer**, not a failure. Roughly 18 genuine water-loading points serve a
peninsula defined by a shipping canal, and that is itself a true finding.

### 4.6 Air

Hamilton's John C. Munro is a **cargo** airport of national significance;
Niagara District is not. `dist_airport_m` is replaced by
**`dist_cargo_airport_m`**, with non-cargo airfields excluded.

### 4.7 Labour access

`transit_400m` is replaced by **`transit_service_at_shift_times`** — derived
from the Niagara Region GTFS feed already held. A stop with two buses a day is
not labour access, and industrial shifts begin at 06:00 and 23:00. Where GTFS is
unavailable the attribute is `null`, not `false`.

---

## 5. Servicing — capacity, not membership

**Verified 2026-08-27.** Hamilton publishes pipe-level attributes:

| Layer | Features | Capacity fields |
|---|---:|---|
| Sewer main | 54,115 | **`PIPEDIAM`**, `PIPEHT`, `PIPETYPE`, **`INSTDATE`** |
| Watermain | 38,298 | **`WAT_SIZE`**, **`PRESZONE`**, `INSTDATE` |

"In a sewer catchment" is nearly meaningless — every serviced property is in
one. **"Nearest sanitary main is 300 mm, installed 1962"** is an engineering
fact a developer acts on.

Attributes: `sewer_nearest_diam_mm`, `sewer_nearest_installed`,
`water_nearest_size_mm`, `water_pressure_zone`, plus
`sewer_capacity_confidence` reflecting that diameter is a proxy for capacity and
not capacity itself — remaining headroom is not published anywhere.

`INSTDATE` additionally gives **infrastructure age**, which cuts both ways: a
district on 1950s mains faces disruption and renewal on the same horizon.

Combined-sewer-overflow events remain the only published stress proxy.

---

## 6. Constraints — fractions, two reclassifications, and a veto class

### 6.1 Fractions, not booleans

Per engine spec §4, constraints are **area fractions** on polygon-tier units.
Address-tier units are points: a point has no area, so they receive **boolean
containment**, and `unit_tier` already records why. A point must never report a
fraction of 0.0 or 1.0 as though one had been computed.

### 6.2 Two attributes are wrong in kind

**`c_archaeological` is not a constraint.** Areas of archaeological potential
are a **screening trigger**: they require an assessment before development. That
is a cost and a delay, not a prohibition. Hopkins Steel Works showed 100%, which
under the original model would read as fully blocked. Renamed
**`trigger_archaeological_assessment`** and moved out of the constraint group.

**`c_heritage` conflates two legal states.** *Designated* property is protected;
*listed* property is on a register and watched. Split into
`c_heritage_designated` and `flag_heritage_listed`.

### 6.3 The veto class

Constraints subtract. Some conditions **disqualify** regardless of everything
else, and expressing them as a large negative weight misrepresents them:

| Veto | Source | Why absolute |
|---|---|---|
| `veto_low_clearance_access` | OSM `maxheight`, **229 in study area** | a standard trailer cannot reach the site. Hamilton's own 450-feature bridge layer carries **no clearance data**; OSM is the only source |
| `veto_no_commercial_crossing` | crossing classification | for border-dependent operations only |
| `veto_attenuation_zone` | Ontario Waste Management Attenuation Zone | a **subsurface** contaminant zone adjacent to landfill, legally defined, invisible at surface |
| `veto_landlocked` | parcel geometry (§9) | no public road frontage |

Vetoes are reported **beside** the scores, never summed into them, and each
names the record that produced it.

---

## 7. The two-pass join

Naïvely, ~362,000 polygon units against constraint layers whose densest feature
is **137 KB** (#62, Provincial Natural Heritage System — 51 polygons, 7 MB) is
millions of intersections against geometry with tens of thousands of vertices.

1. Build a `shapely.STRtree` over each constraint layer.
2. For each unit, query the tree for candidates whose bounding boxes overlap.
3. Compute exact intersection area **only** against survivors, in EPSG:32617.

A parcel in Wainfleet has zero bbox overlap with a Hamilton wetland and the tree
answers that in microseconds. Exact maths still happens where it matters.

**The prefilter is itself a correctness surface.** A bbox bug silently drops real
intersections and every test still passes. Required test: a **known-encumbered
parcel** returns encumbered — not merely that the code runs.

Distances use the same trees with the E4 ceiling.

---

## 8. Regulatory registers — a first-class source class

The strongest evidence for a land question often lives outside land data.
Planning data says what land is *permitted* to do; regulatory filings say what
someone *actually did*, under legal compulsion, with dates and quantities.

Seven provincial registers, all **OGL Ontario**, none in any municipal
catalogue, all **address- or point-keyed** and therefore consumed through the
**J2** join into plan 1's anchor index without modification:

| Register | Signal | Depth |
|---|---|---|
| **HWIN** hazardous waste generators/receivers, with volumes | activity + scale | **annual, 2002–** |
| **EWRB** energy & water use, buildings >100,000 sq ft | **occupancy** | multi-year |
| **Permit to Take Water** (>50,000 L/day), spatial | water-intensive industry | current |
| **Environmental Occurrences and Spills** | contamination history | 2003–2022 |
| **Aggregate Sites Authorized** (incl. **inactive**) | industrial land, former | active/inactive |
| **Waste Management Sites** (WMIS) | constraint + historic industry | current |
| **Waste Management Attenuation Zones** | **subsurface veto** (§6.3) | current |

### 8.1 Two of these change what the engine can claim

**HWIN outperforms the NEI on every axis that matters**: it is a regulatory
filing rather than a voluntary survey, it spans twenty years rather than four
editions, and it carries actual volumes rather than employee bands. A site
generating waste annually to 2014 and nothing since **stopped operating** —
observed, dated, from a register.

**EWRB closes a gap previously believed structural.** Engine spec §5.4 scaled
dormancy back to a sparse flag because Ontario cannot observe vacancy the way
Rochester can — MPAC is closed. That is true of *assessment*. Energy consumption
is an independent route to the same fact: **a 100,000 sq ft building reporting
near-zero energy intensity is empty.** The size threshold is a feature — 100,000
sq ft *is* the industrial segment.

Caveats recorded, not glossed: EWRB is **XLSX, not spatial** (needs J2), and the
publisher states **"data is not cleansed."**

### 8.2 The guard applies most sharply here

These registers name businesses and locations, and they sound consequential.

- **Permitted:** *"Registered as a hazardous waste generator, 2002–2014"* —
  a cited fact from a public register, with dates.
- **Forbidden:** *"This site is contaminated."* *"This operator was negligent."*

Engine spec §1.1 governs. Every attribute derived from these registers carries
its source id and the register's own wording, and the UI quotes rather than
concludes.

---

## 9. Parcel geometry — computable and unused

Area alone discards most of what a parcel's shape determines:

| Attribute | Why it matters |
|---|---|
| `frontage_m` | a parcel with 12 m of road frontage cannot take a loading dock |
| `shape_ratio` | a long thin parcel cannot accept a rectangular building however large its area |
| `veto_landlocked` | parcels with no public road boundary exist and are undevelopable |
| `assembly_adjacent_vacant` | contiguous vacant parcels are a different proposition from one |

**Ownership-based assembly is Rochester-only.** `OWNERNME1` makes common-owner
adjacency computable there; MPAC makes it impossible in Ontario. The attribute
exists and returns `null` in Ontario — an honest regional difference rather than
an absent field.

---

## 10. Agri-industrial — the Niagara Peninsula's distinctive sector

Observed in the study area (Overpass, 2026-08-27):

```
greenhouse horticulture 612 · vineyards 836 · orchards 176 · wineries 82
```

**612 greenhouses is the finding.** Greenhouse horticulture is *industrial
production under agricultural zoning* — high energy and water demand,
year-round labour, truck movements, CO₂ supply. It behaves like a factory and is
classified like a farm. An atlas of the physical industrial economy that omits
it misses a real part of the peninsula's productive base.

**Greenbelt Specialty Crop Areas** (OGL Ontario, LIO) cut both ways: *inside* is
a development constraint; *adjacent* is a locating advantage for processing —
short haul from field to plant. Both are computable and they are different
attributes: `c_specialty_crop_area` and `adjacent_specialty_crop`.

This also explains why §8's registers are unusually well-aimed here: greenhouses
and food processors are precisely the operations that trip the 50,000 L/day
water threshold and the 100,000 sq ft energy-reporting threshold.

Already held and never sectored: the NEI carries **NAICS 311 (food
manufacturing)** and **312 (beverage)** on every business.

**Blocked, recorded so it is not re-attempted:** OMAFRA's *Food processing client
information* is catalogued with **no licence and no resources**. CFIA's Safe Food
for Canadians licence registry is a **web search tool, not open data**.

**Unmapped, recorded as a known gap:** **cold storage** — the binding constraint
on food processing. Nothing maps it. Weak proxies only: NAICS 493 in the NEI,
and Hamilton's cooling-tower registry.

---

## 11. Region configuration

Per E2, everything region-specific is configuration:

```
region:
  crs: EPSG:32617                 # asserted, not assumed — must cover the region
  municipalities: [...]           # the allow-list, per plan 1's study-area filter
  sources:
    - id, path, join_method (J1-J6), fields{number,street,municipality}, licence
  access_points: {rail_served, interchanges, crossings, water_loading, cargo_airports}
  constraints: [...]              # each with fraction|boolean|veto
```

Waterloo Region needs four address layers on four hosts and no parcels;
Rochester needs one parcel layer with assessed value and twelve historical
snapshots. Neither fits a hardcoded module.

---

## 12. Failure modes

| Failure | Mitigation |
|---|---|
| **Silent zero from untagged source data** — 2,223 rail features lack `usage` | every derived access attribute carries a tag-confidence field; absence of evidence is never absence |
| **bbox prefilter drops real intersections** | a known-encumbered parcel must return encumbered (§7) |
| **A stale count read as current** | `road_aadt_year` mandatory; `as_of` per attribute group |
| **Geocoding loss read as absence** | J2 reports a match rate; a floor fails the build (plan 1 precedent, `GEOCODE_FLOORS`) |
| **A veto expressed as a weight** | vetoes are a separate output field, never summed |
| **A register quoted as a conclusion** | §8.2; attributes carry source id and the register's own wording |
| **Projection error in area maths** | EPSG:32617 asserted at the pipeline boundary |

---

## 13. Data to fetch

Small — hundreds of features, not the hundreds of thousands a naive OSM pull
would bring:

- OSM: `highway=motorway_junction` (265); dock/quay/harbour/crane (~18);
  `maxheight` (229); greenhouse/vineyard/orchard/winery (1,706)
- Provincial (LIO/OGL): Greenbelt Specialty Crop Areas; Waste Management Sites;
  Waste Management Attenuation Zones; Aggregate Sites Authorized
- Provincial (files.ontario.ca/OGL): HWIN annual series; Permit to Take Water
  (SHP); Environmental Occurrences and Spills (CSV); EWRB (XLSX)
- Border crossings classified by commercial permission — **source not yet
  identified** (§14)

---

## 14. Open items

1. **Border crossing commercial classification** — no source identified. Without
   it `dist_commercial_crossing_m` cannot be computed and must be omitted rather
   than approximated.
2. **Welland Canal locks** — an Overpass `lock=yes` query returned **1** for a
   canal with eight. OSM tags them differently; needs a proper look.
3. **Cold storage** — unmapped (§10).
4. **Sewer capacity headroom** — diameter is a proxy; actual remaining capacity
   is not published by anyone.
5. **EWRB address quality** — publisher states data is not cleansed; the J2
   match rate must be measured before any occupancy claim rests on it.
6. **Rochester `PARCELID` stability across twelve snapshots** — assumed, not
   verified. Carried from the spike; it is the same assumption that `nei_id`
   needed and address strings failed.
7. **Seasonality** — Seaway winter closure and spring half-load restrictions are
   real and are properties of a *mode*, not of geometry. Documented as caveats;
   deliberately not modelled as distances.
8. **Fire response time** (Hamilton publishes it) sets industrial insurance
   grading. Not yet assessed.
