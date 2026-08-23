# Atlas backlog

Data sources that are real but not yet in the map, plus application work
that has been designed and deferred — kept so nothing found or decided gets
lost between sessions. Everything in Tier A was verified
against a live endpoint on the date shown — those are facts, not leads.

Companion to [DATA-SOURCES.md](DATA-SOURCES.md) (what we use and why),
[us/DATA-SOURCES.md](us/DATA-SOURCES.md) (the American side),
[RECON-2026-08-22.md](RECON-2026-08-22.md) (municipal/provincial/federal
reconnaissance and the government roster) and
[CANDIDATES.md](CANDIDATES.md) (the numbered catalogue sweep — 126 selectable
datasets) and **[INGESTION-LEDGER.md](INGESTION-LEDGER.md)** — the standing
record of the merged collection: what was selected, which endpoint each layer
resolves to, when it was last verified and when it was last pulled. Amend the
ledger on every fetch.

**Currently live:** 11 map layers plus one reference table — 18,386 features,
24.8 MB — from OpenStreetMap, the City of Hamilton, NYS GIS, NYS Department of
State, NYS DEC, and the US Census Bureau.

**Held locally, not yet ingested:** 143 Niagara layers (1,065,376 features,
2.0 GB) — see [INGESTION-LEDGER.md](INGESTION-LEDGER.md). **Hamilton: 90
candidates verified 2026-08-23 (1,349,254 features), none yet fetched** — see
[CANDIDATES-HAMILTON.md](CANDIDATES-HAMILTON.md). Hamilton currently holds only
**4 layers / 3,422 features** in `data/`, the weakest coverage in the atlas.

---

# Application backlog

## Per-dataset filtering in the right sidebar

**Designed 2026-08-19, deferred.** Replaces the narrower idea of splitting
Petroleum Bulk Storage into its own layer.

The right sidebar gains **two tabs**:

1. **Feature** — what is there now: the selected feature's classification,
   provenance and source attributes, plus per-listing actions.
2. **Dataset** — controls for manipulating one dataset: filtering, refining,
   subsetting.

Each dataset in the left panel gets a **tall, narrow side button** beside its
switch. Clicking it loads that dataset into the Dataset tab, where its
contents can be refined.

**Why this rather than more layers.** Petroleum Bulk Storage is 3,502 of the
4,845 features in `us-facilities`, and much of it is fuel retail rather than
industry. Splitting it into a separate switch would fix that one case and
leave the general problem — every merged dataset eventually has a subset
somebody wants to exclude. Nine DEC registries would become nine switches,
Hamilton zoning would want splitting by zone code, OSM places by tag. The
left panel becomes unusable long before the data is complete.

A filter mechanism solves the class rather than the instance, and keeps
ingestion honest: the shipped GeoJSON stays a faithful copy of what the
source published, and the *viewer* decides what to look at. That also
preserves the provenance guarantee — filtering at ingestion quietly changes
what "the dataset" means, filtering in the UI does not.

**Open questions when this is picked up:** whether filter state belongs in
the URL (the reference project encodes map and filter state there); whether
filters apply per-session or persist; and whether a filtered layer should
say so on the map, so a reader cannot mistake a filtered view for full
coverage.

---

# ⚠ Live data defect — the departures layer

**Found 2026-08-23 while assembling a site dossier.**
`data/niagara-departures.geojson` is **live in the atlas** and asserts that 68
named businesses departed. It is substantially wrong.

Checked against the NEI 2022 inventory (`scripts/.cache/nei2022.geojson`):

| | |
|---|---:|
| Claimed departures | 68 |
| Same name **and** address **and** municipality present in NEI 2022 | **18 — definitively false** |
| Same business name present, address string differs | 42 — *probably* also false |
| No name match in NEI 2022 | 8 |

**Worked case.** `Hopkins Steel Works`, 2 Broadway, Welland — the layer records
*last seen 2018, gone by 2022*. NEI id **8130 is present in 2017, 2018, 2019
and 2022** at that address. It never departed.

The 42 middle cases are uncertain only because address strings drift between
survey years (`2 Broadway` in 2018 → `2 Broadway Street` in 2019), which is the
same normalization problem as §5.6 of the engine spec. On a name-only match,
**60 of 68 (88%)** are still present.

**Why this matters beyond data quality.** A false departure is a published
claim that a *named business* ceased operating at a *stated address*. That is
precisely the class of claim the defamation guard in
`2026-08-19-niagaraassembly-atlas-design.md` §7 exists to prevent, and it is
live now.

**Actions:**
1. Treat the layer as unpublishable until rebuilt.
2. Rebuild departure detection on normalized `nei_id` **plus** normalized
   address, not on name matching — and require absence across *all* later
   survey years, not just one.
3. Add the check as a regression test: no feature in a departures layer may
   name a business present in any later NEI edition.

Found by assembling a site dossier rather than by any score — see engine spec
§6. A per-site evidence assembly surfaced a contradiction that a regional
aggregate never would.

---

# Data backlog

## Tier A — verified available, not loaded

Counts, schemas and licences confirmed by query on **2026-08-18**. These need
ingestion work, not investigation.

### Haldimand County — 425 items, own server, found 2026-08-23

Single-tier municipality on the western peninsula; never previously
considered. Server `gis.haldimandcounty.ca`, Hub feed at
`opendata-haldimand.hub.arcgis.com/data.json`.

- **Zoning/Zones — 3,391** · **Topo/BuildingFootprint — 29,447** (both verified)
- Also: OfficialPlan/Land_use, Planning Applications, ParcelsOnlinePublic,
  Civic Addresses, Special Flood Plain Policy Areas, Holding, Special
  Provisions, Bylaw Reference, Conservation Authorities
- Licence not yet checked.

### Provincial planning constraints — found 2026-08-23

All **OGL – Ontario**, via LIO GeoHub. The atlas currently has no constraint
layers at all; these plus NPCA regulation lands are the whole category.

- **Niagara Escarpment Plan** — boundary, policy area, **land use
  designations**. The NEC has real development control through Grimsby,
  Lincoln, St. Catharines, Thorold and NOTL.
- **Greenbelt** — designations, specialty crop areas, river valley
  connections, towns/villages, hamlets. Constrains much of rural Niagara.
- **Provincially Significant Employment Zones** — 428 KB ZIP, verified 200.

### Welland — retrieved 2026-08-22, blocked on one layer

Origin ArcGIS Server (`arcgisweb.welland.ca`) is **down** — "Could not access
any server machines" at every path. Retrieved via the ArcGIS Online Hub cache
instead (`opendata.arcgis.com/api/v3/datasets/{itemId}_{layer}/downloads/data`).
11 of 12 priority layers cached in `scripts/.cache/welland/`; see
[RECON-2026-08-22.md](RECON-2026-08-22.md).

- **Current Zoning** 1,981 polygons, 73 Industrial · **Old Zoning** 2,014
  (a two-epoch regulatory pair)
- **Building Footprints** 26,027 · **Civic Address Points** 22,461
- **Business Directory** 923 businesses with exact FullTime/PartTime/Seasonal
  counts and `Estab` year, no geometry — geocodable against the address points.
  NEI 2022 records 1,299 businesses in Welland against this 923: **two
  independent registers disagreeing by ~29%**, which makes Welland the
  calibration municipality for the scoring engine.
- **Business Licenses — 404 at every sublayer.** In DCAT, not cached. Retry
  when the origin server recovers.
- Discovery note: the Hub feed (`open.welland.ca/data.json`) carries **172
  datasets against CKAN's 44**, including Official Plan and Consolidated
  Zoning which CKAN omits entirely.

### Niagara Consolidated NEI — 98,065 business points
The largest verified source found, and twelve times the size of the entire
current atlas.

- OGL 2.0 (Niagara Region); GeoJSON download ready
- Fields: `nei_id, Year, municipality, businessname, businessstreetnumber,
  businessstreetname, businessunit, businesspobox, businesspostalcode,
  businesswebsite, primarynaics, secondarynaics, primarysector, industry,
  yearopen, indoorgfa, sizerangeemployees`
- **Blocked on two decisions, not on access:**
  1. Multi-year consolidated inventory since 2016 — one row per business per
     survey year. Needs group-by-`nei_id`, keep-latest-`Year`, and that year
     carried through as the feature's freshness stamp.
  2. It covers exactly the half of the map that currently has **no**
     authoritative data. Loading it inverts the coverage asymmetry rather
     than fixing it: Niagara becomes business-rich while Hamilton stays
     business-blind, because Hamilton publishes no equivalent. Worth deciding
     how the UI communicates that *before* ingesting.

### Hamilton Buildings — 214,293 footprints
Verified count. Not loaded because a single file of this size is the wrong
shape for a browser; needs splitting by key or tile, the way the reference
project splits its large dataset into `data/voa/*.json`.

### Hamilton zoning, non-industrial — 11,448 polygons
Already fetched, then filtered out at ingestion, and still sitting in the
local response cache. Recoverable without another network call if the atlas
ever wants full zoning context rather than industrial-only.

### Further Hamilton layers seen in the catalogue, never pulled
All present in the DCAT feed with live GeoServices endpoints:

Addresses · Development Applications · Vacant Building Registry ·
Businesses by Employee Count · Building & Demolition Permits (2008–2016 and
2017–present) · Planning Applications Reported Quarterly · Waterbodies ·
Watercourse · Airport · Business Improvement Areas · Historic Railways

**Both checked 2026-08-23; see [CANDIDATES-HAMILTON.md](CANDIDATES-HAMILTON.md).**

- **Vacant Building Registry — 84 records, table, no geometry.** Fields
  `STATUS, ZONING, IN_DATE, ISSUE_DATE, EXPIRY_DATE, FOLDER_NAME`. This is
  **recorded** vacancy, not inferred — the only ground truth in the atlas, and
  the calibration set for the under-occupancy model.
- ~~**Businesses by Employee Count**~~ — **CLOSED.** It is **10 rows, a
  city-wide summary table** of business counts per employee band, with no
  geometry. It is a statistic, not a register, and **does not close the
  Hamilton business gap.** Do not re-investigate.
- **Partial replacement found:** the licence registers — Salvage Yards (12),
  Public Garages (578), Trade Contractors and Masters (654) — give **1,244
  named, addressed industrial businesses**. Not comprehensive, but industrial-
  specific and the best business-level data Hamilton publishes.
- **Also closed: "Real Estate Sales"** is 9 rows of annual `Q1..Q4` totals, not
  transactions. It does not change the MPAC dead end.

---

## Tier B — read 2026-08-22

Catalogues read; see [RECON-2026-08-22.md](RECON-2026-08-22.md) for detail.

| Source | Outcome |
|---|---|
| Ontario GeoHub / data.ontario.ca | **Provincially Significant Employment Zones** — OGL-Ontario, 428 KB ZIP package, verified HTTP 200. Ingest. Municipal Land Use Planning (CSV) useful but modest. |
| Open Government Canada | Low yield. Industrial/rail hits are the 2006 National Atlas raster series. StatCan NAICS tables are aggregate, not geolocated — cannot serve as a register. **NPRI** facility data (ECCC data mart) is geolocated and is the EPR analogue, but only covers above-threshold reporters. |
| Ontario Brownfields environmental site registry | **Blocked** — catalogued with no resources and no licence. The Record of Site Condition registry is a web lookup, not a feed. Needs a human look. |
| Ontario land parcels | **Closed** — licensed "Not applicable"; the Teranet/MPAC fabric, catalogued but not released. Extends the existing MPAC dead end to the provincial level. |

---

## Tier C — speculative, never probed

Ordered by how much they would change the map.

1. **Burlington — KNOWN WEAKNESS, flagged 2026-08-23.** The weakest part of
   the entire source base; unimproved across three passes. Burlington is in
   core scope and covered by **neither** the Hamilton nor the Niagara
   datasets, so any region-wide layer or score is weakest exactly there.
   Probed without success on **2026-08-19**. `opendata.burlington.ca` exists but returns **HTTP 403**;
   `gis.burlington.ca` does not resolve; the `cityofburlington` ArcGIS Online
   org has only 8 public items (historic locations and a bulk-trash form,
   nothing industrial, and possibly Burlington Vermont). No DCAT feed found at
   the usual Hub paths. **Next step is a human look at burlington.ca's open
   data page, or Halton Region as the upper tier** — the 403 in particular
   suggests a portal that exists and is refusing automated requests rather
   than one that is absent.
2. **Halton Region — never probed at all.** Burlington's upper tier and the
   only route to patching the Burlington hole from an adjacent tier. Highest
   unprobed priority.
3. **Statistics Canada** — business counts by NAICS and census subdivision.
   The obvious candidate for the Hamilton business gap, and the only one that
   would let Hamilton and Niagara be compared on the same basis.
4. ~~**The nine Niagara lower-tier municipalities**~~ — **resolved
   2026-08-22, see [RECON-2026-08-22.md](RECON-2026-08-22.md).** They do not
   run separate portals: `niagaraopendata.ca` is a shared CKAN catalogue with
   11 publishing organizations and 534 datasets. Niagara Falls (329 datasets,
   35,104 parcels, building footprints at 2010 *and* 2018) and St. Catharines
   (46,193 land-use parcels, 498 designated Employment) are Tier A and ready
   to ingest. Six municipalities publish nothing at all. NPCA was also found
   publishing 335 items including Regulated Floodplain Extent and Approximate
   Regulation Lands.
5. **HOPA Ports** (Hamilton-Oshawa Port Authority) — returned HTTP 403 to a
   plain request; needs a different approach or a human look.
6. **CN / CPKC / Metrolinx / VIA** — public infrastructure only. Assume no
   train positions exist; see closed list below.
7. **Hamilton brownfield programme** — no spatial dataset obvious in the
   catalogue scan. OSM currently supplies 263 `landuse=brownfield` polygons
   region-wide as an interim proxy.
8. **Hamilton "Industrial Sectors A–N"** — the City's own names for its
   industrial districts, published on a neighbourhood-boundaries PDF rather
   than as data. Relevant to §14 corridor detection as the authoritative
   naming to check discovered clusters against.

---

## Confirmed closed

Do not re-attempt. Each was established by direct check.

- **Real-time freight rail positions** — no public feed exists in Canada. CN
  and CPKC do not publish them; shipment tracking is customer-authenticated.
- **Seaway vessel transit** — public to read, `robots.txt: Disallow: /`. Link
  out; never crawl. Registered in `sources.json` with status `excluded`.
- **MPAC** — Ontario parcel and assessment data. Bulk access is fee-based and
  income/expense data is withheld. There is no Ontario equivalent of the UK
  rating-list feed behind the standard industrial-underuse method.
- **Niagara ArcGIS Hub DCAT feed** — 404. Discover through the CKAN catalogue
  at `niagaraopendata.ca`, download from `open.niagararegion.ca`.
