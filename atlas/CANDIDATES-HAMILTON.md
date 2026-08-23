# Candidate datasets — City of Hamilton

**Swept and verified 2026-08-23.** Hamilton's ArcGIS Hub carries **463
datasets**, 336 with live REST endpoints, 391 under the City of Hamilton Open
Data Licence. This is the Hamilton counterpart to
[CANDIDATES.md](CANDIDATES.md) (Niagara, #1–126).

**Numbers run from 201** so Hamilton and Niagara never collide. Quote them to
include, exclude or re-pull.

**90 candidates · 89 verified reachable · 1,349,254 features.**

Licence: **City of Hamilton Open Data Licence** throughout (attribution
required). Compatible with Niagara's OGL 2.0; the share-alike question remains
OSM's alone.

---

## Why this sweep was needed

The atlas currently holds **four Hamilton layers — 3,422 features**:
employment land (22), rail (1,692), truck routes (1,250) and industrial zoning
(458). The 2026-08-22 bulk fetch was the *Niagara* catalogue only, so Hamilton
has had none of that treatment despite being central to the atlas.

### Three findings that change the engine design

**1. Hamilton has no parcel fabric.** The full DCAT feed was searched; no
parcel or assessment-geometry layer exists. Hamilton can never reach the
`parcel` rung of the analysis ladder — its ceiling is `footprint`.

**2. "Businesses by Employee Count" does not close the business gap.**
[BACKLOG.md](BACKLOG.md) named it *"the only candidate found so far for closing
the Hamilton business gap."* It is **10 rows, a table, no geometry** — a
city-wide summary of business counts per employee band. A statistic, not a
register. **This lead is now closed.**

**3. "Real Estate Sales" is not transactions.** 9 rows of `YEAR, Q1..Q4,
TOTAL` — an annual summary. It is not the for-sale/lease data the atlas has
been unable to find anywhere, and it does not change the MPAC dead end.

### But Hamilton has two things Niagara does not

**#221 Vacant Building Registry — 84 records of RECORDED vacancy**, with
status and dates. Every other vacancy signal in this atlas is *inference*.
This is a municipality stating on the record that a building is vacant, which
under the project's rules is a categorically different kind of claim and must
be rendered as a cited fact rather than a score. It is also the **calibration
set for the entire under-occupancy model**: if our inference does not rank
known-vacant buildings highly, the inference is wrong.

**#267–269 licence registers — 590 named and addressed industrial businesses,
plus 654 named without location.** Verified against the fetched data
2026-08-23: Salvage Yards (12) and Public Garages (578) carry
`BUSINESS_ADDRESS` and are geocodable; **Trade Contractors and Masters (654)
has no address field at all** — `LICENSE_NUMBER, LICENSE_TYPE,
SUB_DESCRIPTION, BUSINESS_NAME, EXPIRY_DATE` and nothing more. It is a
business-name register useful for matching, not a mappable layer. Not
comprehensive, but industrial-specific and better than the nothing previously
recorded. Partially offsets finding 2.

**Also: 194,466 building and demolition permits across two epochs** (#222–223),
explicitly including demolition — but **the two epochs are schema-incompatible
and the demolition signal is not uniform across them.** Verified 2026-08-23:

- **2017–present (#223)** carries a type-coded permit prefix. `DP` =
  Demolition Permit, **3,007 records at 97.2% precision** — a clean typed
  signal needing no text parsing.
- **2008–2016 (#222)** uses *year* prefixes (`12-`, `10-`, `15-`) with **no
  type code**. Demolitions can only be found by keyword on `DESCRIPTION`
  (6,068 matches), and keyword matching cannot separate "demolished" from
  "demolished and replaced" — opposite findings for a transition score.

The engine must therefore treat Hamilton's demolition axis as **strong from
2017 and weak before it**, carried as a per-attribute caveat rather than
presented as a uniform 2008–2026 series.

---

## A · Land, planning and zoning

| # | Dataset | Geom | Records | Pri | Why it matters |
|---|---|---|---:|---|---|
| 201 | Employment Lands | Polygon | 22 | ★★★ | authoritative industrial land — 22 designated AREAS not sites |
| 202 | Zoning By-law Boundary | Polygon | 11,931 | ★★★ | full zoning; currently only the industrial subset is loaded |
| 203 | Land Use by Ward | Polygon | 16 | ★★ | ward-level land-use split |
| 204 | Land Use by Ward 2018 | Polygon | 16 | ★★★ | two-epoch pair with the above — land-use change by ward |
| 205 | Urban Boundary | Polygon | 1 | ★★★ | settlement envelope |
| 206 | Rural Boundary | Polygon | 6 | ★★ | rural/urban split |
| 207 | Rural Settlement Areas | Polygon | 19 | ★★ | rural employment nodes |
| 208 | City Boundary | Polygon | 1 | ★★ | clip and attribution |
| 209 | Community Boundaries | Polygon | 6 | ★★ | sub-municipal geography (Stoney Creek, Ancaster, Dundas…) |
| 210 | Neighbourhoods | Polygon | 234 | ★ | reporting geography |
| 211 | Ward Boundaries | Polygon | 15 | ★ | reporting geography |
| 212 | City Properties | Point | 2,313 | ★★★ | publicly held land — directly actionable |
| 213 | Development Applications | Point | 5,189 | ★★★ | live development pipeline |
| 214 | Planning Applications Reported Quarterly | Point | 1,154 | ★★ | planning throughput |
| 215 | Commercial Corridor Community Improvement Project Ar | Polygon | 14 | ★★ | incentive geography |
| 216 | Commercial District Community Improvement Project Ar | Polygon | 12 | ★★ | incentive geography |
| 217 | Tax Increment Grant Program Recipients | table | 21 | ★★ | realised incentive uptake |
| 218 | Non-Residential Assessment Percentage of Total Asses | table | 11 | ★★ | non-residential tax base share |

## B · Buildings, permits and vacancy

| # | Dataset | Geom | Records | Pri | Why it matters |
|---|---|---|---:|---|---|
| 219 | Buildings | Polygon | 214,293 | ★★★ | 214k footprints — the physical fabric, never yet pulled |
| 220 | Addresses | Point | 273,535 | ★★★ | 273k address points — the geocoding base for every Hamilton table |
| 221 | Vacant Building Registry | table | 84 | ★★★ | RECORDED vacancy — the only ground truth in the atlas |
| 222 | Building and Demolition Permits 2008 to 2016 | table | 142,620 | ★★★ | 142k permits incl. demolition |
| 223 | Building and Demolition Permits 2017 to Present | table | 51,846 | ★★★ | 52k permits incl. demolition — pairs with the above |
| 224 | Building Permits Issued | table | 8 | ★★ | permit series |
| 225 | Building Code Compliance Inspections | table | 8 | ★ | compliance history |
| 226 | Housing Starts | table | 23 | ★ | construction activity |
| 227 | Registered Cooling Towers | Point | 304 | ★★ | industrial/commercial mechanical plant — proxy for large serviced buildings |

## C · Infrastructure and servicing

| # | Dataset | Geom | Records | Pri | Why it matters |
|---|---|---|---:|---|---|
| 228 | Sanitation Sewer Wastewater Catchment Areas | Polygon | 13,947 | ★★★ | 13,947 catchments — servicing capacity, far finer than Niagara's |
| 229 | Wastewater Treatment Plant Catchment Areas | Polygon | 2 | ★★★ | plant-level servicing |
| 230 | Combined Overflow Wastewater Catchment Areas | Polygon | 8,147 | ★★★ | where the system is stressed |
| 231 | Combined Sewer Overflow Events | Point | 97 | ★★ | observed overflow events |
| 232 | Sewer Main | Polyline | 54,115 | ★★★ | sewer network extent |
| 233 | Sewer Lift Station | Point | 96 | ★★ | pumping infrastructure |
| 234 | Sewer Manhole | Point | 48,828 | ★ | network detail |
| 235 | Water Pressure District | Polygon | 28 | ★★★ | fire-flow capacity — a real industrial siting constraint |
| 236 | Watermain | Polyline | 38,298 | ★★★ | water network extent |
| 237 | Water Hydrant | Point | 14,189 | ★★ | fire flow at point level |
| 238 | Stormwater Management Facilities | Polygon | 148 | ★★ | stormwater capacity |
| 239 | Street Light Poles and Luminaires | table | — | ★ | proxy for fully serviced corridors |
| 240 | Volume of Wastewater Treated | table | 8 | ★ | system load |

## D · Transportation and logistics

| # | Dataset | Geom | Records | Pri | Why it matters |
|---|---|---|---:|---|---|
| 241 | Railways | Polyline | 1,692 | ★★★ | freight rail — already loaded |
| 242 | Truck Route Network | Polyline | 1,250 | ★★★ | already loaded |
| 243 | Truck Route Aggregated Data | Polygon | 435 | ★★★ | truck volumes |
| 244 | Truck Route Statistics | table | 5 | ★★ | truck volumes |
| 245 | Average Daily Traffic Count | Point | 2,350 | ★★★ | 2,350 measured counts — the AADT evidence layer |
| 246 | Street Centreline | Polyline | 19,855 | ★★★ | road network |
| 247 | Bridges | Point | 450 | ★★ | load and clearance constraints on freight |
| 248 | Airport | Polygon | 5 | ★★ | air freight node |
| 249 | HSR Bus Routes | Polyline | 46 | ★★★ | labour-force access |
| 250 | HSR Bus Stops | Point | 2,389 | ★★ | labour-force access at stop level |
| 251 | Transit Service Areas | Polygon | 1 | ★★ | transit catchment |
| 252 | Traffic Collisions | table | 134,136 | ★ | corridor risk |
| 253 | Roundabouts | Point | 49 | ★ | freight turning constraints |
| 254 | Temporary Road Closures | Polyline | 1 | ★ | live disruption |

## E · Environmental constraint

| # | Dataset | Geom | Records | Pri | Why it matters |
|---|---|---|---:|---|---|
| 255 | Escarpment | Polyline | 1 | ★★★ | the Niagara Escarpment through Hamilton — hard development control |
| 256 | Environmentally Sensitive Areas Boundaries | Polygon | 207 | ★★★ | 207 protected areas |
| 257 | Waterbodies | Polygon | 3,721 | ★★ | hydrography |
| 258 | Watercourse | Polyline | 11,252 | ★★★ | setback constraint |
| 259 | Shoreline | Polyline | 273 | ★★ | harbour and lake edge |
| 260 | Contour Lines | Polyline | 221,518 | ★★ | terrain — grading cost |
| 261 | Air Monitoring Sites - O3,SO2,NO2 Data | Point | 1,074 | ★★ | industrial emissions context |
| 262 | Air Monitoring Sites - PAH Data | Point | 27 | ★★ | industrial emissions context |
| 263 | Surface Water Quality Program | table | 2,181 | ★ | receiving-water quality |
| 264 | Adverse Water Quality Incidents | table | 6 | ★ | observed incidents |
| 265 | Waste Landfills and Transfer Stations | Point | 18 | ★★★ | industrial land use and siting constraint |
| 266 | Community Wide Greenhouse Gas (GHG) Emissions | table | 18 | ★ | emissions baseline |
| 290 | Targeted Terrestrial Natural Heritage System |  | **no-endpoint** | ★★★ | city-designated natural heritage system — development constraint |

## F · Economy, business and employment

| # | Dataset | Geom | Records | Pri | Why it matters |
|---|---|---|---:|---|---|
| 267 | Licensed Salvage Yards | table | 12 | ★★★ | 12 industrial businesses, named and addressed |
| 268 | Licensed Public Garages | table | 578 | ★★★ | 578 vehicle-trade businesses, named and addressed |
| 269 | Licensed Trade Contractors and Masters | table | 654 | ★★★ | 654 trades businesses — partial business register |
| 270 | Business Improvement Areas | Polygon | 14 | ★★ | organised commercial districts |
| 271 | Businesses by Employee Count | table | 10 | ★ | 10-row CITY-WIDE SUMMARY — does NOT close the business gap |
| 272 | Employment by Sector for Hamilton CMA | table | 11 | ★★ | sector employment, CMA level |
| 273 | City Growth Targets Employment | table | 25 | ★★ | planned employment growth |
| 274 | Economic Diversification Score | table | 7 | ★ | economic indicator |
| 275 | Real Estate Sales | table | 9 | ★ | 9-row ANNUAL SUMMARY — not transactions |
| 276 | Census Labour Force | Polygon | 32 | ★★ | workforce availability |
| 277 | Census Occupation 2021 | Polygon | 16 | ★★ | skills base |
| 278 | Census Occupation 2016 | Polygon | 16 | ★★ | two-epoch pair with the above |
| 279 | Census Unemployment | Polygon | 2 | ★ | labour slack |
| 280 | Average Unemployment Rate | table | — | ★ | labour slack |

## G · Heritage and risk

| # | Dataset | Geom | Records | Pri | Why it matters |
|---|---|---|---:|---|---|
| 281 | Heritage Properties | Point | 10,266 | ★★★ | protected structures |
| 282 | Hamilton Heritage Property Grant Program Recipients | table | 12 | ★ | heritage investment |
| 283 | Fire - Building Structure Fires | table | 7 | ★★ | structure fire history — industrial risk and loss |
| 284 | Fire - Vulnerable Occupancy | table | 3 | ★ | risk register |
| 285 | Hamilton Fire Department Incidents | table | 49,643 | ★ | incident history |

## H · Reference

| # | Dataset | Geom | Records | Pri | Why it matters |
|---|---|---|---:|---|---|
| 286 | Census Profile 2016 | table | 2,247 | ★ | baseline demographics |
| 287 | Census Dwellings 2021 | Polygon | 16 | ★ | housing stock |
| 288 | Population and Dwelling Count by Census Tract 2016 | table | 142 | ★★ | census geography joins |
| 289 | Municipal Benchmarking Network Canada MBNC | table | 967 | ★ | comparators |

---

## Handling notes

**Most of Hamilton's highest-value records are tables, not spatial layers.**
Permits, the vacant registry and the licence registers all carry addresses but
no geometry. They must be geocoded against **#220 Addresses (273,535 points)**
before they can join anything. That geocoding step is a build-stage dependency
for §B and §F, and its match rate should be reported rather than assumed —
an unmatched permit is not a permit that did not happen.

**#290 Targeted Terrestrial Natural Heritage System** is catalogued as a
document rather than a service; needs a targeted look.

**Two datasets share the title "Heritage Properties"** — one a feature service
(10,266 points, #281), one a web app viewer. Title-based resolution picks the
wrong one; resolve Hamilton datasets by endpoint, not by name.

**Layer indices are unstable.** Hamilton assigns them per-service and they have
been observed to change. Resolve by name through the DCAT feed at build time
rather than hard-coding `/2`, `/8`, `/11`.

