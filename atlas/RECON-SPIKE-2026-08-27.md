# Reconnaissance spike — Waterloo Region and Rochester

**Time-boxed spike, 2026-08-27.** Purpose: not to catalogue these regions, but to
answer one question — **which join methods does each support?** — so that the
enrichment stage is designed against what varies rather than against Niagara's
particular mix.

Every count below was observed by live query on 2026-08-27.

---

## 1. The six join methods

The pipeline cannot assume any particular source, but it can assume a small set
of ways evidence gets joined. Ordered by how much each can be trusted:

| # | Method | Joins | Trust | Output |
|---|---|---|---|---|
| J1 | **Identifier** | record → record | strongest | exact, or absent |
| J2 | **Normalized address** | table → anchor | strong | a **measurable match rate** |
| J3 | **Point-in-polygon** | anchor → unit; unit → constraint | strong | containment, exact |
| J4 | **Containment** | footprint → parcel | strong | exact |
| J5 | **Proximity** | unit → linear feature | weak | a distance, always stated |
| J6 | **Geometric overlap** | polygon → polygon | weakest | a threshold, always stated |

A region's capability is which of these it can support, not how many datasets
it publishes.

---

## 2. Waterloo Region — the Niagara pattern again

`data.waterloo.ca/data.json` — **548 datasets, one shared catalogue, four
publishers**:

```
221  City of Kitchener      133  City of Waterloo
125  Region of Waterloo      69  Cambridge, Ontario
```

This is structurally identical to `niagaraopendata.ca`: an upper tier and its
lower-tier municipalities publishing through one feed, each on its own ArcGIS
org. **Four separate `Addresses` layers**, one per municipality, on four
different service hosts — including one on `maps.cambridge.ca` and one behind
`utility.arcgis.com`.

### What it supports

| Method | Supported? | Evidence |
|---|---|---|
| J1 Identifier | **unknown** | business directory and licences exist; stability across editions unverified |
| J2 Address | **yes** | 4 municipal address layers, plus building permits, business licences, business directory |
| J3 Point-in-polygon | **yes** | Cambridge Official Plan + Zoning Lookup; Kitchener zoning map |
| J4 Containment | **partial** | building footprints for 2 of 4 municipalities; **no parcel layer found** |
| J5 Proximity | yes | standard |
| J6 Overlap | n/a | no competing polygon sources to reconcile |

**Ceiling: `footprint` tier**, same as Hamilton — no parcels published.

**No assessment data**, as expected: MPAC is a paid dead end province-wide, and
this confirms it is not a Niagara-specific gap.

---

## 3. Rochester — a different kind of region entirely

`data.cityofrochester.gov/data.json` — 281 datasets. But the structure is what
matters, not the count.

### Tax parcels carry assessed value

`Open_Data/TaxParcel2024/FeatureServer/0` — **64,828 parcels**, polygon, 42
fields. The join-relevant ones:

```
PARCELID  SITEADDRESS  CLASSCD  CLASSDSCRP  OWNERNME1  STATEDAREA
CURRENT_LAND_VALUE  CURRENT_TOTAL_VALUE  CURRENT_TAXABLE_VALUE
TENTATIVE_LAND_VALUE  TENTATIVE_TOTAL_VALUE  TENTATIVE_TAXABLE_VALUE
```

Observed distribution:

| Class | Parcels |
|---|---:|
| all | **64,828** |
| industrial (700-series) | 365 |
| commercial (400-series) | 6,663 |
| vacant land (300-series) | 4,768 |
| **total value = land value** (zero improvement value) | **4,717** |

**This is the VOA equivalent.** The UK reference atlas's whole method rests on
rating-list data — assessed value per property. Ontario denies it (MPAC, paid,
income and expense withheld). **Rochester publishes it free.**

The load-bearing signal is the ratio of land value to total value. Observed
samples:

```
total 185,500 / land 172,500  ->  13,000 of improvement value  (near-derelict)
total 641,600 / land 185,000  ->  456,600 of improvement value (well built)
total 475,000 /  land 88,000  ->  387,000 of improvement value
```

A parcel whose total value approaches its land value has little building value
left. **4,717 parcels are in exactly that state**, and that is an *observation
from an assessment register*, not an inference from absence — a categorically
stronger claim than anything the Niagara method can make.

### And it has depth in time

**Tax parcel snapshots for 1996, 2000, 2004, 2008, 2012, 2018, 2019, 2020,
2021, 2022, 2023 and 2024**, published as separate datasets. Nearly thirty
years of assessed value per parcel. Under-occupancy in Rochester is not a
static ratio but a *trajectory*.

### What it supports

| Method | Supported? | Evidence |
|---|---|---|
| J1 Identifier | **yes, strongest in the project** | `PARCELID` across 12 snapshots 1996–2024 |
| J2 Address | yes | `SITEADDRESS` on every parcel |
| J3 Point-in-polygon | yes | parcels are polygons |
| J4 Containment | **yes** | `Building Footprints: Live` + parcels |
| J5 Proximity | yes | standard |
| J6 Overlap | yes | city-owned parcels vs tax parcels |

**Ceiling: `parcel` tier, with assessed value.** Higher than anywhere in the
Ontario study area.

---

## 4. What this changes

**The regions are not variations on one theme; they sit at different rungs.**

| Region | Unit ceiling | Assessment | Business register | Temporal depth |
|---|---|---|---|---|
| Niagara Falls, St. Catharines | parcel | ✗ | NEI | 4 NEI editions |
| Welland, Hamilton, Waterloo Region | footprint | ✗ | NEI (Niagara only) | permits |
| Other 9 Niagara municipalities | address | ✗ | NEI | 4 NEI editions |
| **Rochester** | **parcel + value** | **✓** | ✗ | **12 snapshots, 1996–2024** |

Three consequences for the design:

**1. Under-occupancy must be method-agnostic.** In Niagara it is a ratio of
floor area and employment against parcel area, computed from the employment
*upper* bound so the engine understates itself. In Rochester it is
`improvement value / total value` from an assessment register — a different
computation, a stronger evidence class, and it deserves to be labelled as such
rather than averaged into the same number.

**2. The evidence class must travel with the score.** The spec already separates
observation from inference. This makes it concrete: Rochester's under-occupancy
is `observed`, Niagara's is `inferred`. Rendering them identically would be the
same category error as the `HISTORICAL` vs `INFERRED` freshness question.

**3. Region configuration, not region code.** Waterloo needs: four address
layers on four hosts, zoning from two municipalities, no parcels. Rochester
needs: one parcel layer with value fields, twelve historical snapshots, a
building layer. Neither fits a hardcoded module. Source descriptors, field
mappings, CRS and the municipality allow-list all belong in configuration.

---

## 5. What was NOT probed

Recorded so the gap is explicit rather than silently absent.

- **Region of Waterloo's own 125 datasets** — none matched the planning
  keyword scan; not individually inspected.
- **Monroe County** (Rochester's county tier) — `data.monroecounty.gov` does not
  resolve. NYS GIS Clearinghouse is the likely route and is already a source
  for the existing `us-*` layers.
- **Licence terms for both regions** — Rochester's DCAT licence field contains
  HTML rather than a licence name and needs a human look. Waterloo's not checked.
- **Whether Rochester's `PARCELID` is genuinely stable across all 12 snapshots**
  — assumed from its name and format, not verified. This is the single most
  load-bearing assumption in the whole spike and should be tested before any
  trajectory work, exactly as `nei_id` stability was tested for Niagara.
- **Buffalo** — not touched; it is the nearer US city and already partly in the
  atlas via NYS layers.
