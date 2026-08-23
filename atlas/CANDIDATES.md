# Candidate datasets — Niagara catalogue sweep

**Swept 2026-08-23. Endpoints verified and bulk-fetched 2026-08-23.** Every
dataset in the shared catalogue (`niagaraopendata.ca`, 534 records → 409 after
removing `WGS 1984` / `Web Map` / `Viewer` duplicates), plus the Niagara Region
ArcGIS Hub (104) and the Welland Hub (172).

**125 of 126 selected** (all but #98). Numbers are stable — quote them to add,
drop or re-pull. Live retrieval state is tracked in
**[INGESTION-LEDGER.md](INGESTION-LEDGER.md)**; this file is the menu and the
rationale.

### Column key

- **Acc** — how the data actually comes out: `REST` ArcGIS query endpoint ·
  `File` direct CSV/XLSX/ZIP · `Hub cache` ArcGIS Online cache (used where an
  origin server is down) · `Raster` image/map service, served as tiles rather
  than a bulk file · `—` no machine-readable distribution.
- **Lyr** — number of distinct source layers behind the entry. Several
  candidates bundle more than one (#16 is three by-laws, #113 three ortho epochs).
- **Recs** — observed record count. `raster` for imagery, `—` where not countable.
- **Pri** — ★★★ core to analysis · ★★ strong context · ★ situational.
- **Notes** — access variations, blockers and handling caveats.

Publisher key: **RGN** Niagara Region · **NF** Niagara Falls · **STC** St. Catharines ·
**WEL** Welland · **LIN** Lincoln · **FE** Fort Erie · **BRU** Brock University ·
**NOD** NiagaraOpenData

> **Correction to the record:** `open.niagararegion.ca/data.json` and
> `/api/feed/dcat-us/1.1.json` both return **HTTP 200** as of 2026-08-23.
> DATA-SOURCES.md records the Hub DCAT feed as a 404 dead end on 2026-08-18.
> That entry is stale — the Hub *is* directly harvestable, and it carries a
> category taxonomy CKAN does not expose.

---

## A · Land, planning and zoning

| # | Dataset | Pub | Acc | Lyr | Recs | Pri | Why it matters / Notes |
|---|---|---|---|---:|---:|---|---|
| 1 | Consolidated NEI (98,065 pts) | RGN | REST | 1 | 98,065 | ★★★ | The business register. Already in plan |
| 2 | NEI 2017 / 2018 / 2019 / 2022 annual editions | RGN | File | 4 | — | ★★★ | Year-over-year change detection; already cached <br>▸ Four annual editions — one layer each. |
| 3 | Urban Area Boundaries | RGN | REST | 1 | 27 | ★★★ | Settlement envelope — inside/outside changes everything |
| 4 | Regional Growth Centre | RGN | REST | 1 | 3 | ★★ | Provincially-directed intensification areas |
| 5 | Rural Settlements | RGN | REST | 1 | 31 | ★★ | Rural employment nodes outside urban boundary |
| 6 | Agricultural Land Base | RGN | REST | 1 | 33 | ★★★ | The competing land designation; hard constraint |
| 7 | Strategic Locations for Investment | RGN | File | 1 | — | ★★★ | Region's own named investment geography |
| 8 | CIP Project Area | RGN | REST | 1 | 28 | ★★ | Regional community improvement areas |
| 9 | Municipal Boundaries | RGN | REST | 1 | 12 | ★★★ | Join key for every municipal source |
| 10 | Niagara Region Neighbourhoods | RGN | File | 1 | — | ★ | Sub-municipal reporting geography |
| 11 | Property Parcels (35,104) | NF | REST | 1 | 35,104 | ★★★ | Parcel fabric |
| 12 | Official Plan Schedule A Land Use (1,196) | NF | REST | 1 | 1,196 | ★★★ | Authoritative designation, precomputed `AREA_SQM` |
| 13 | Official Plan Schedule A2 Urban Structure | NF | REST | 1 | 1,785 | ★★ | Structural plan overlay |
| 14 | Official Plan Special Policy Areas | NF | REST | 1 | 100 | ★★ | Site-specific policy exceptions |
| 15 | Zoning By-law 79200 (1,988) | NF | REST | 1 | 1,988 | ★★★ | Primary zoning |
| 16 | Zoning By-laws 1538 Crowland / 7069 Humberstone / B0395 Willoughby | NF | REST | 3 | 173 | ★★★ | Legacy township by-laws — coverage is the *union* of all four <br>▸ **Three legacy by-laws** — coverage is the union with #15. |
| 17 | Parcel Fabric Public (44,265) | STC | REST | 1 | 44,265 | ★★★ | Parcel fabric |
| 18 | City Parcel Landuse Public (46,193; 498 `Employment`) | STC | REST | 1 | 46,193 | ★★★ | Authoritative industrial land, parcel-level |
| 19 | City Parcel Zoning Public (46,222) | STC | REST | 1 | 46,222 | ★★★ | Zoning at parcel granularity |
| 20 | Current Zoning 2017-117 (1,981; 73 industrial) | WEL | REST | 1 | 1,981 | ★★★ | Retrieved <br>▸ Retrieved via **AGO Hub cache**; Welland origin server down. |
| 21 | Old Zoning (2,014) | WEL | REST | 1 | 2,014 | ★★★ | **Two-epoch pair with #20** — regulatory change |
| 22 | Official Plan Schedule B (2,598) | WEL | REST | 1 | 2,598 | ★★ | Retrieved |
| 23 | Official Plan Appeal Deferral Areas | WEL | REST | 1 | 2 | ★★ | Land under active appeal — contested status |
| 24 | Lincoln Zoning Information (SHP) | LIN | File | 1 | — | ★★ | Needs conversion, no REST |
| 25 | Township Lot and Concession | NF | REST | 1 | 540 | ★ | Historic survey fabric; underlies old parcels |
| 26 | Subdivisions | NF | REST | 1 | 554 | ★ | Registered plans |

## B · Infrastructure and servicing

| # | Dataset | Pub | Acc | Lyr | Recs | Pri | Why it matters / Notes |
|---|---|---|---|---:|---:|---|---|
| 27 | **RMoN San SPS Catchments** | RGN | REST | 1 | 119 | ★★★ | **Sanitary sewer pumping-station catchments — the servicing-capacity layer.** Highest-value item in this section |
| 28 | Combined Sewage Overflows (CSO) | RGN | File | 2 | — | ★★★ | Where the sewer system is already stressed |
| 29 | Open Landfills in Niagara Region | RGN | — | 1 | — | ★★ | **BLOCKED.** Industrial land use in its own right; also a siting constraint <br>▸ Catalogue entry is a **portal page**, not a service. |
| 30 | Waste Collection Areas | RGN | REST | 1 | 180 | ★ | Service boundary proxy |
| 31 | Regional Road Streetlighting | RGN | File | 1 | — | ★ | Proxy for fully-serviced road corridors |
| 32 | Niagara Weather Information Systems (RWIS) | RGN | File | 1 | — | ★ | Road weather stations; winter logistics reliability |
| 33 | Hydrants Public | STC | REST | 1 | 4,235 | ★★ | Fire flow — a real industrial siting constraint |
| 34 | Niagara Falls Hydrants | NF | REST | 1 | 3,184 | ★★ | As #33 |
| 35 | Sanitary Sewer Maintenance Holes | NF | REST | 1 | 6,516 | ★★ | Sewer network extent |
| 36 | Storm Sewer Maintenance Holes / Stormwater Drainage Structures | NF | REST | 2 | 17,080 | ★★ | Stormwater capacity |
| 37 | Water System Valves / Water Main Breaks | NF | REST | 2 | 5,577 | ★★ | Water network extent and **failure history** |
| 38 | Utility Drawing | NF | REST | 1 | 120 | ★ | Utility corridor reference |
| 39 | Building Footprints (region-wide) | RGN | REST | 1 | 225,999 | ★★★ | Physical fabric across all 12 municipalities |
| 40 | Building Footprints 2018 (42,247) | NF | REST | 1 | 42,247 | ★★★ | Physical fabric |
| 41 | Building Footprints 2010 (39,556) | NF | REST | 1 | 39,556 | ★★★ | **Two-epoch pair with #40** — demolition/construction |
| 42 | Building Footprints (26,027) | WEL | Hub cache | 1 | 26,027 | ★★★ | Retrieved <br>▸ Retrieved via **AGO Hub cache**; Welland origin server down. |
| 43 | Address Points | RGN | REST | 1 | 208,004 | ★★★ | Region-wide geocoding base |
| 44 | Civic Address Points (22,461) | WEL | REST | 1 | 22,461 | ★★★ | Retrieved; geocodes the Business Directory (#71) |
| 45 | Address Points / Master Street Address Guide | NF | REST | 2 | 36,770 | ★★ | Geocoding base |

## C · Transportation and logistics

| # | Dataset | Pub | Acc | Lyr | Recs | Pri | Why it matters / Notes |
|---|---|---|---|---:|---:|---|---|
| 46 | **Regional Road Traffic Volumes (AADT)** | RGN | File | 1 | — | ★★★ | **Measured traffic counts — the freight-corridor evidence layer.** Direct counterpart to the NYS DOT truck AADT already in the atlas |
| 47 | Roads (regional) | RGN | REST | 1 | 23,782 | ★★★ | Road hierarchy |
| 48 | Welland Canal | RGN | REST | 1 | 11 | ★★★ | The defining industrial corridor of the peninsula |
| 49 | Airports | RGN | REST | 1 | 3 | ★★ | Air freight nodes |
| 50 | Marinas | RGN | REST | 1 | 12 | ★ | Water access points |
| 51 | Pedestrian Ferry | RGN | REST | 1 | 1 | ★ | Cross-canal connectivity |
| 52 | Niagara Region Transit GTFS | RGN | File | 1 | — | ★★★ | **Labour-force access** — can workers reach the site? |
| 53 | Public Transit Routes | RGN | File | 1 | — | ★★ | As #52, simpler geometry |
| 54 | Road Closures and Lane Restrictions | RGN | — | 1 | — | ★★ | **BLOCKED.** Live disruption feed; freshness demo for a "living map" <br>▸ Published as a **web page** only — live feed not machine-readable. |
| 55 | Rail Lines (58) | WEL | REST | 1 | 58 | ★★★ | Retrieved |
| 56 | Niagara Falls Roads / Road Intersections / Road Allowance | NF | REST | 3 | 5,963 | ★★ | Local network detail |
| 57 | MTO Buffer Controlled Areas | NF | REST | 1 | 2 | ★★★ | **Provincial highway setback — hard development constraint** |
| 58 | Lands requiring MTO approvals within Lincoln | LIN | File | 1 | — | ★★★ | As #57, Lincoln |
| 59 | Niagara Falls International Bridge / International Boundary | NF | REST | 2 | 3 | ★★ | Border crossing geometry — central to peninsula industry |
| 60 | Bike Routes / Niagara Trails | RGN | REST/File | 2 | 9 | ★ | Active transport; weak industrial signal |
| 61 | Sidewalks / Sidewalk Snowplow Routes | NF | REST | 2 | 4,097 | ★ | Urban fabric detail |

## D · Environmental and natural-heritage constraint

| # | Dataset | Pub | Acc | Lyr | Recs | Pri | Why it matters / Notes |
|---|---|---|---|---:|---:|---|---|
| 62 | Provincial Natural Heritage System | RGN | REST | 1 | 51 | ★★★ | Provincial-level protection |
| 63 | NES Other Wetlands (Non-PSW) | RGN | REST | 1 | 7,774 | ★★★ | Wetland constraint |
| 64 | NES Other Woodlands + Significant Woodlands | RGN | REST | 2 | 5,085 | ★★ | Tree protection constraint |
| 65 | NES Perm/Int Watercourses + Contemporary Mapping of Watercourses | RGN | REST/File | 2 | 28,098 | ★★★ | Setback constraint |
| 66 | NES Shoreline Areas | RGN | REST | 1 | 3,820 | ★★ | Shoreline development constraint |
| 67 | NES Inland Lakes + Waterbodies | RGN | REST/File | 2 | 6 | ★★ | Hydrography base |
| 68 | Quaternary + Tertiary Watersheds | RGN | REST | 2 | 15 | ★★ | Drainage framework for cumulative-impact analysis |
| 69 | Aquatic Species at Risk Maps (Beamsville/Vineland/Campden/Tintern; Jordan) | LIN | — | 2 | — | ★★ | **BLOCKED.** Species-at-risk constraint <br>▸ **SHP download only**, no REST service. Needs conversion. |
| 70 | Lincoln Greenbelt Boundaries | LIN | File | 1 | — | ★★ | Municipal cut of the Greenbelt |
| 71 | Woodland Management Inventory + Sites | NF | REST | 2 | 115 | ★ | Local tree constraint |
| 72 | Monitored Beach Water Quality / Niagara Beach Monitoring | RGN | File | 2 | — | ★ | Downstream water-quality context |

## E · Heritage and archaeological constraint

| # | Dataset | Pub | Acc | Lyr | Recs | Pri | Why it matters / Notes |
|---|---|---|---|---:|---:|---|---|
| 73 | **NOP Area of Archaeological Potential** | RGN | REST | 1 | 11,023 | ★★★ | **Triggers mandatory assessment before development** — a real cost and delay signal |
| 74 | Designated Heritage Properties | RGN | REST | 1 | 318 | ★★★ | Protected structures, region-wide |
| 75 | Heritage Properties | NF / WEL / STC | REST | 3 | 1,224 | ★★ | Municipal heritage registers |
| 76 | Historic Sites | RGN | REST | 1 | 234 | ★ | Contextual |
| 77 | Historical Welland Canal Points of Interest | RGN | File | 1 | — | ★★ | Industrial-archaeology narrative for the canal corridor |
| 78 | War of 1812 Points of Interest | RGN | File | 1 | — | ★ | Contextual only |

## F · Economy, business and employment

| # | Dataset | Pub | Acc | Lyr | Recs | Pri | Why it matters / Notes |
|---|---|---|---|---:|---:|---|---|
| 79 | **Welland Business Directory (923, exact FT/PT/Seasonal counts)** | WEL | REST | 2 | 923 | ★★★ | **Second independent register; calibrates NEI size bands.** Retrieved <br>▸ **Attribute table, no geometry** — geocode against #44. |
| 80 | Welland Business Licenses | WEL | REST | 1 | 0 | ★★★ | **Blocked — 404, origin server down.** Retry later <br>▸ **404 at every sublayer** — in DCAT but not cached anywhere. |
| 81 | Employment Generator CIP Areas 2026 | NF | REST | 1 | 1 | ★★★ | Where the city actively wants employment |
| 82 | Brownfield CIP Area 2026 + Brownfield CIP Project Areas (11) | NF | REST | 2 | 12 | ★★★ | **Municipally-identified brownfields** — the closest open analogue to a contaminated-land register |
| 83 | Urban Infill Tax Increment Grant Area 2026 | NF | REST | 1 | 1 | ★★ | Financial incentive geography |
| 84 | Community Improvement Plan Areas | NF / WEL | REST | 2 | 3 | ★★ | Incentive geography |
| 85 | Streetscape Improvement CIP Area 2026 | NF | REST | 1 | 1 | ★ | Incentive geography |
| 86 | Development Charges + DC Exemption Waiver Areas | NF / RGN | REST/File | 2 | 2 | ★★★ | **Cost-of-development surface** — directly affects viability |
| 87 | Current Development Applications | NF | REST | 1 | 109 | ★★★ | **Live pipeline — what is being proposed right now** |
| 88 | Site Plan Applications (696) | WEL | REST | 1 | 721 | ★★★ | As #87, retrieved |
| 89 | Completed Building Permits + Permits by Neighbourhood/Year | NF | REST | 2 | 13,252 | ★★★ | **Realised investment history** |
| 90 | Building Permits Public | STC | REST | 1 | 11,100 | ★★★ | As #89 |
| 91 | CityView BuildPermits Parcels | WEL | — | 1 | — | ★★ | **BLOCKED.** Permits joined to parcels <br>▸ **Token Required** — private ArcGIS layer. Needs a credential from Welland. |
| 92 | Construction Activity (active) | WEL | — | 1 | — | ★★ | **BLOCKED.** Live construction <br>▸ Hub links out; Welland **origin server down**. |
| 93 | City Owned Property (675) | NF | REST | 1 | 675 | ★★★ | **Publicly-held land — directly actionable for a development agency** |
| 94 | Business Improvement Areas | RGN / NF / WEL | REST | 2 | 6 | ★★ | Organised commercial districts |
| 95 | Chambers of Commerce | RGN | File | 1 | — | ★★ | Institutional contacts |
| 96 | Employment Search Agencies | RGN | File | 1 | — | ★ | Labour-market intermediaries |
| 97 | Wineries (+ Wineries in Lincoln) | RGN / LIN | REST | 1 | 93 | ★★ | **Niagara's signature agri-industrial sector** — real processing floorspace |
| 99 | Niagara Region Capital Budget | RGN | File | 1 | — | ★★★ | **Where infrastructure money is going next** — forward-looking signal |
| 100 | Niagara Region Tender Results + Past Tender Results | RGN | File | 2 | — | ★★ | Actual public construction spend; contractor ecosystem |
| 101 | Niagara Prosperity Initiative Projects | RGN | File | 1 | — | ★ | Economic development programme geography |
| 102 | Niagara Falls 2021 Census — Industry Sectors (NAICS 2017) | NF | REST | 1 | 21 | ★★ | NAICS at census geography; validates NEI |
| 103 | Welland 2016 Census — Industry (NAICS) | WEL | REST | 1 | 15 | ★★ | As #102 |
| 104 | Niagara Census Profiles | NOD | — | 1 | — | ★★ | **BLOCKED.** Region-wide census rollup <br>▸ **Report/CSV landing page**, not a feed. |
| 105 | Statistics Canada 2016 Census of Agriculture | NOD | — | 1 | — | ★ | **BLOCKED.** Agri-processing base <br>▸ **StatCan landing page**, not a feed. |

## G · Historical imagery and basemaps

| # | Dataset | Pub | Acc | Lyr | Recs | Pri | Why it matters / Notes |
|---|---|---|---|---:|---:|---|---|
| 106 | **Niagara Air Photo Mosaic 1934** | BRU | REST | 1 | — | ★★★ | **Pre-war industrial peak.** Ground truth no vector source can give <br>▸ Brock **image service** on `terra.library.brocku.ca`; tiles, not a bulk file. |
| 107 | **Niagara Air Photo Mosaic 1954** | BRU | REST | 1 | — | ★★★ | Post-war expansion <br>▸ Brock **image service**; tiles, not a bulk file. |
| 108 | **Niagara Air Photo Mosaic 1965** | BRU | — | 1 | — | ★★★ | **BLOCKED.** Industrial high-water mark <br>▸ Image service — 1965 mosaic needed a different probe path. |
| 109 | **Niagara Air Photo Mosaic 1972** | BRU | REST | 1 | — | ★★★ | Immediately pre-decline <br>▸ Brock **image service**; tiles, not a bulk file. |
| 110 | Niagara Air Photo Index | BRU | — | 1 | — | ★★ | **BLOCKED.** Coverage index for #106–109 <br>▸ Index is a **document**, not a service. |
| 111 | Niagara Topographic Maps 1910s / 1930s / 1950s / 1960s / 1970s | BRU | Raster/REST | 5 | raster | ★★ | Rail spurs, works and canals as mapped at the time <br>▸ Five map series — one layer each. |
| 112 | Niagara Historical Map Gallery | BRU | — | 1 | — | ★ | **BLOCKED.** Catalogue of the above <br>▸ **Gallery page**, not a service. |
| 113 | Niagara Falls Ortho Imagery 2006 / 2013 / 2018 | NF | Raster | 3 | raster | ★★★ | **Brackets the 2010–2018 footprint pair (#40/#41)** <br>▸ Image services on `portal.niagarafalls.ca` **refused the request**. |
| 114 | Niagara Falls 2018 1m Contours | NF | REST | 1 | 24,835 | ★★ | Terrain — grading cost, drainage |
| 115 | Niagara Falls Base Map | NF | REST | 1 | 22 | ★ | Cartographic reference |

## H · Labour-force and demographic context

| # | Dataset | Pub | Acc | Lyr | Recs | Pri | Why it matters / Notes |
|---|---|---|---|---:|---:|---|---|
| 116 | Census Dissemination Areas 2011 / 2016 | NF | REST | 2 | 294 | ★★ | Smallest census geography for joins |
| 117 | NF 2021 Census — Labour Force Status | NF | REST | 1 | 21 | ★★ | Workforce availability |
| 118 | NF 2021 Census — Commuting Destination / Duration / Main Mode | NF | REST | 3 | 63 | ★★★ | **Where workers actually travel** — catchment evidence <br>▸ Three census tables — one layer each. |
| 119 | NF 2021 Census — Class of Worker / Occupation (NOC 2021) | NF | REST | 2 | 42 | ★★ | Skills base |
| 120 | NF 2021 Census — Highest Certificate/Diploma/Degree | NF | REST | 1 | 21 | ★ | Skills base |
| 121 | All Schools / Private Career Colleges / Literacy and Adult Education | RGN | REST/File | 3 | 248 | ★ | Training pipeline |
| 122 | Licensed Child Care Centres / EarlyON Centres | RGN | REST | 2 | 199 | ★ | Workforce-participation enabler |

## I · Administrative and reference

| # | Dataset | Pub | Acc | Lyr | Recs | Pri | Why it matters / Notes |
|---|---|---|---|---:|---:|---|---|
| 123 | By-Law Index | RGN | — | 1 | — | ★★ | **BLOCKED.** Locates the governing by-law behind a designation <br>▸ By-law index is a **document listing**. |
| 124 | Municipal Boundary / City Limits | NF / STC / WEL / FE | REST/File | 4 | 2 | ★★ | Clipping and attribution |
| 125 | Niagara Region Council Elected Officials | RGN | File | 1 | — | ★ | Contact/accountability layer |
| 126 | Niagara Region MBNCanada Benchmarking | RGN | File | 1 | — | ★ | Municipal performance comparators |

---

## Access variations, in full

Recorded because they change how each source has to be handled, and because
a blocked source that is silently dropped stops being visible.

### Retrieved by a route other than the publisher's own server

**Welland** (#20–23, #42, #44, #55, #79, #84, #88, #124). The city's ArcGIS
Server at `arcgisweb.welland.ca` returns *"Could not access any server
machines"* at every path — a server-side outage, not a 404 or a permission
refusal. The data is retrievable from the **ArcGIS Online Hub cache**:

```
https://opendata.arcgis.com/api/v3/datasets/{itemId}_{layer}/downloads/data?format=geojson&spatialRefId=4326
```

The cache and the origin are independent, so a layer can be live in the
catalogue and unreachable at source while still being retrievable. Worth
encoding as an ingestion fallback rather than treating an origin failure as
absence.

### Rasters, not vector files

**#106, #107, #109** (Brock air photo mosaics 1934/1954/1972) and **#113**
(Niagara Falls ortho 2006/2013/2018) are **image services**. They are served as
map tiles, not as a bulk file — there is no single download that constitutes
"the dataset". Service metadata is captured; the imagery is consumed as a tile
layer at display time. #108 (1965) needed a different probe path.

### Attribute tables with no geometry

**#79 Welland Business Directory** — 923 rows carrying `Address`/`City`/`PC`
but no coordinates. Rejects `outSR` and `f=geojson`; must be queried as
`f=json` and geocoded against **#44** Welland Civic Address Points.

### Genuinely closed

**#91 Welland CityView BuildPermits Parcels** returns ArcGIS error 499
*Token Required*. It is a private layer. Not fetchable without a credential
issued by the City of Welland — this one will not resolve itself.

**#80 Welland Business Licences** is listed in DCAT but 404s at every
sublayer and is not in the Hub cache. Blocked until the origin recovers.

### Portal pages and documents rather than services

**#29** Open Landfills · **#54** Road Closures · **#104** Niagara Census
Profiles · **#105** StatCan Census of Agriculture · **#110** Air Photo Index ·
**#112** Historical Map Gallery · **#123** By-Law Index. Each is catalogued
but published as a web page, report or document listing. They carry real
information and may be worth extracting by hand, but none is a feed.

**#69** Lincoln Aquatic Species at Risk and **#24** Lincoln Zoning are
**shapefile-only** — no REST service, so they need a conversion step.

---

## Deliberately excluded

Reviewed and judged noise for this atlas — recorded so the sweep is provably
complete rather than selectively reported. **#98 Farmers Market** was also
dropped at selection.

Election results, campaign contributions, poll boundaries, electors by
age/channel/school-support · council attendance and remuneration · tree
giveaways · cemetery plots · splash pads, ball hockey, basketball, tennis,
soccer, baseball diamonds, playgrounds · public art · sports clubs ·
immunization coverage and sites · health inspection results · foodbanks,
homeless shelters, seniors homes, newcomer agencies, family resource centres,
donation locations · garbage tag vendors, refrigerant stickers, recycling
container pick-up, special-events recycling tonnages · website statistics and
open-data usage dashboards · events calendars · places of worship · museums,
arenas, libraries, beaches, campgrounds, golf courses · language, religion,
ethnicity, immigration, marital status and mobility census tables · Fort Erie
budget books · prohibited hunting areas · internet survey data.

Some social-infrastructure layers are defensible as labour-context and are
kept in §H at ★; the rest are excluded on relevance, not quality.
