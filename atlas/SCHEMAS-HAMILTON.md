# Hamilton — fetched schemas

**Inspected 2026-08-23** with `scripts/inspect_cache.py` against the files
actually downloaded, not against catalogue metadata. Field names, fill rates
and sample values are observed.

**87 layers profiled — 56 spatial, 31 attribute tables.**

Companion to [CANDIDATES-HAMILTON.md](CANDIDATES-HAMILTON.md) (what and why)
and [INGESTION-LEDGER.md](INGESTION-LEDGER.md) (retrieval state).

---
## What the inspection changed

**#239 Street Light Poles and Luminaires is EMPTY — 0 features.** Catalogued,
live, and containing nothing. Drop it.

**#280 Average Unemployment Rate returns HTTP 500** — *"Service
OpenData/Tabular_Dashboards_1/MapServer not started"*. A Hamilton-side outage,
not a fetch problem. Retry later.

**#269 Licensed Trade Contractors has no location field**, so 654 of the
licensed businesses are a name register rather than a mappable layer. The
addressed industrial business count for Hamilton is **590**, not 1,244.

**Demolition is typed only from 2017.** #223 carries a permit-type prefix —
`DP` = Demolition Permit, **3,007 records at 97.2% precision**. #222
(2008–2016) uses *year* prefixes with no type code, so demolitions there can
only be keyword-matched on `DESCRIPTION` (6,068 hits) and keyword matching
cannot separate "demolished" from "demolished and replaced".

**All dates are epoch milliseconds** (`1575349200000`), across every table.
Convert at normalization.

---
## Attribute tables — the geocoding dependency

31 of 87 layers carry no geometry. They must be joined to
**#220 Addresses (273,535 points)** before they can appear on the map, and the
match rate must be reported: an unmatched permit is not a permit that did not
happen.

### Geocodable by street address

| # | Table | Rows | Address field |
|---|---|---:|---|
| 217 | tax-increment-grant-program-recipients | 21 | `LOCATION` |
| 221 | vacant-building-registry | 84 | `FOLDER_NAME` |
| 222 | building-and-demolition-permits-2008-to-2016 | 142,620 | `ORIGINALADDRESS1`, `ORIGINALADDRESS2` |
| 223 | building-and-demolition-permits-2017-to-pres | 51,846 | `ORIGINALADDRESS1`, `ORIGINALADDRESS2` |
| 267 | licensed-salvage-yards | 12 | `BUSINESS_ADDRESS` |
| 268 | licensed-public-garages | 578 | `BUSINESS_ADDRESS` |
| 282 | hamilton-heritage-property-grant-program-rec | 12 | `ADDRESS` |

### Locatable only by intersection or cross-street — harder

| # | Table | Rows | Field | Note |
|---|---|---:|---|---|
| 245 | Average Daily Traffic Count | 2,350 | `LOCATION_DESCRIPTION` | intersection strings |
| 252 | Traffic Collisions | 134,136 | `LOCDESCRIP` | e.g. `JAMES ST N @ REBECCA ST` |
| 285 | Fire Department Incidents | 49,643 | `XSTREET_1`, `XSTREET_2` | cross-street pair |

Intersection geocoding needs a road-network join against **#246 Street
Centreline (19,855)** rather than an address point lookup. Different technique,
lower match rate, and worth deciding whether it earns the effort — #252 is a
road-safety dataset whose industrial relevance is indirect.

> The inspector's address detector produced false positives on `LOCATIONTYPE`
> (#252) and on #244's pivoted column names. Those are **not** address fields;
> the table above is the corrected reading.

### Non-spatial summary tables — context, not layers

Small year-by-value series with no joinable key. Useful as regional context
charts; they are not map layers and should not sit in the layer registry:

**#218** non residential assessment percentage of total assessment (11), **#224** building permits issued (8), **#225** building code compliance inspections (8), **#226** housing starts (23), **#239** street light poles and luminaires (0), **#240** volume of wastewater treated (8), **#264** adverse water quality incidents (6), **#266** community wide greenhouse gas ghg emissions (18), **#271** businesses by employee count (10), **#272** employment by sector for hamilton cma (11), **#273** city growth targets employment (25), **#274** economic diversification score (7), **#275** real estate sales (9), **#283** fire building structure fires (7), **#284** fire vulnerable occupancy (3).

---
## Spatial layers

| # | Layer | Geometry | Features | Key fields |
|---|---|---|---:|---|
| 201 | employment-lands | Polygon | 22 | `AREA_NAME`, `CATEGORY`, `AREA_HECTARES`, `COMMENTS` |
| 202 | zoning-by-law-boundary | Polygon | 11,931 | `ZONING_CODE`, `ZONING_DESC`, `PARENT_BY_LAW_NUMBER`, `PARENT_BY_LAW_URL`, `BY_LAW_NUMBER` |
| 203 | land-use-by-ward | Polygon | 16 | `GEOGRAPHY`, `YEAR`, `T_TOTALLANDUSE`, `T_AGRICULTURAL`, `T_COMMERCIAL` |
| 204 | land-use-by-ward-2018 | Polygon | 16 | `GEOGRAPHY`, `RESIDENTIAL`, `INSTITUTIONAL`, `COMMERCIAL_OFFICE`, `INDUSTRIAL_WAREHOUSING` |
| 205 | urban-boundary | MultiPolygon | 1 | — |
| 206 | rural-boundary | null | 6 | — |
| 207 | rural-settlement-areas | Polygon | 19 | `NAME`, `BOUNDARY_STATUS`, `OMB_APPROVAL_DATE`, `ADD_DATE` |
| 208 | city-boundary | Polygon | 1 | `AREA_IN_HA` |
| 209 | community-boundaries | Polygon | 6 | `COMMUNITY_NAME` |
| 210 | neighbourhoods | Polygon | 234 | `COMMUNITY`, `NEIGHBOURHOOD`, `PLANNING_UNIT`, `PLANNING_DIVISION` |
| 211 | ward-boundaries | Polygon | 15 | `WARD`, `COUNCILLOR_NAME`, `PHONE`, `EMAIL`, `WEBSITE` |
| 212 | city-properties | Point | 2,313 | `LOCATION`, `PROP_AREA`, `WARD`, `COMMUNITY`, `LEGAL_DESC` |
| 213 | development-applications | Point | 5,189 | `FILE_NUM`, `FILE_TYPE`, `ADDRESS`, `FILE_YEAR`, `DESCRIP` |
| 214 | planning-applications-reported-quarterly | Point | 1,154 | `APPEAL_DATE`, `APPEAL_DECISION_DATE`, `APPEAL_TYPE`, `APPEALED`, `PLANNING_APPLICATION_NUMBER` |
| 215 | commercial-corridor-community-improvemen | Polygon | 14 | `CORRIDOR_CIPA_NAME` |
| 216 | commercial-district-community-improvemen | Polygon | 12 | `CIPA_NAME` |
| 219 | buildings | Polygon | 214,293 | `NAME` |
| 220 | addresses | Point | 273,535 | `NUMBER_COMPLETE`, `UNIT_NUMBER_COMPLETE`, `STREET_NAME`, `STREET_SUFFIX_TYPE`, `STREET_SUFFIX_DIRECTION` |
| 227 | registered-cooling-towers | Point | 304 | `CTO_ID`, `CTS_ID`, `CT_ID`, `ADDRESS`, `BUILDING_NAME` |
| 228 | sanitation-sewer-wastewater-catchment-ar | Polygon | 13,947 | `TYPE` |
| 229 | wastewater-treatment-plant-catchment-are | MultiPolygon | 2 | `SYSTEM` |
| 230 | combined-overflow-wastewater-catchment-a | Polygon | 8,147 | `CATCHMENT_TYPE` |
| 231 | combined-sewer-overflow-events | Point | 97 | `INITIATION`, `COMPLETION`, `CSO_OUTFALL`, `DURATION_HOURS`, `VOLUME_M3` |
| 232 | sewer-main | LineString | 54,115 | `COMPKEY`, `UNITID`, `UNITID2`, `PARLINENO`, `PIPETYPE` |
| 233 | sewer-lift-station | Point | 96 | `COMPKEY`, `UNITID`, `INSTDATE`, `OWN` |
| 234 | sewer-manhole | Point | 48,828 | `COMPKEY`, `UNITID`, `SUBTYPE`, `DROPMH`, `INSTDATE` |
| 235 | water-pressure-district | Polygon | 28 | `DISTRICTID` |
| 236 | watermain | LineString | 38,298 | `COMPKEY`, `UNITID`, `UNITID2`, `PARLINENO`, `PIPETYPE` |
| 237 | water-hydrant | Point | 14,189 | `COMPKEY`, `UNITID`, `SUBTYPE`, `PRESZONE`, `INSTDATE` |
| 238 | stormwater-management-facilities | Polygon | 148 | `FACILITY_NUMBER`, `FACILITY_TYPE`, `COMMUNITY`, `WARD`, `COFA_ECA` |
| 241 | railways | LineString | 1,692 | `RAILWAY_CATEGORY` |
| 242 | truck-route-network | LineString | 1,250 | `STREET_NAME`, `FUNCTIONAL_ROAD_CLASS`, `IS_TRUCK_ROUTE`, `RECOMMENDATION`, `RESTRICTED` |
| 243 | truck-route-aggregated-data | Polygon | 435 | `CORRIDOR_NAME`, `ON_TRUCKROUTE`, `RESTRICTED_TRUCKROUTE`, `NEAREST_TRUCKROUTE_50M`, `NUMBER_OF_COMPLAINTS` |
| 246 | street-centreline | LineString | 19,855 | `SEGID`, `ADDRESS_RANGE_TYPE`, `LEFT_NUM_FROM`, `LEFT_NUM_TO`, `RIGHT_NUM_FROM` |
| 247 | bridges | Point | 450 | `STRUCTURE_ID`, `STRUCTURE_NAME`, `ALT_NAME`, `COMMUNITY`, `WARD` |
| 248 | airport | Polygon | 5 | `NAME` |
| 249 | hsr-bus-routes | MultiLineString | 46 | `LINE_NUMBER`, `LINE_NAME` |
| 250 | hsr-bus-stops | Point | 2,389 | `STOP_ID`, `STOP_NUMBER`, `STOP_NAME`, `ON_STREET`, `AT_STREET` |
| 251 | transit-service-areas | MultiPolygon | 1 | — |
| 253 | roundabouts | Point | 49 | `CATEGORY`, `INTERSECTION` |
| 254 | temporary-road-closures | LineString | 1 | `EVENT_TYPE`, `EVENT_SUBTYPE`, `ROAD_CLOSED_FOR`, `START_DATE`, `END_DATE` |
| 255 | escarpment | MultiLineString | 1 | — |
| 256 | environmentally-sensitive-areas-boundari | Polygon | 207 | `OP_NUMBER`, `ESA_NAME`, `SIGNIFICANCE`, `ANSI_NO`, `ANSI_CLASS` |
| 257 | waterbodies | Polygon | 3,721 | `NAME`, `FEATURE_TYPE`, `OWNERSHIP`, `CA_JURISDICTION`, `WATERSHED` |
| 258 | watercourse | LineString | 11,252 | `NAME`, `FEATURE_TYPE`, `FLOW_CLASSIFICATION`, `FLOW_DIR_VERIFICATION`, `OWNERSHIP` |
| 259 | shoreline | LineString | 273 | — |
| 261 | air-monitoring-sites-o3-so2-no2-data | Point | 1,074 | `POLLUTANT_NAME`, `CONCENTRATION`, `UNIT`, `START_DATE`, `END_DATE` |
| 262 | air-monitoring-sites-pah-data | Point | 27 | `SITE_CODE`, `SAMPLE_ID`, `LOCATION`, `ADDR_QUAL`, `CITY_CODE` |
| 265 | waste-landfills-and-transfer-stations | Point | 18 | `NAME`, `LOCATION`, `COMMUNITY`, `TYPE` |
| 270 | business-improvement-areas | Polygon | 14 | `BIA_NAME` |
| 276 | census-labour-force | Polygon | 32 | `YEAR`, `GEOGRAPHY`, `T_POPULATION_15_AND_OVER`, `T_IN_LABOUR_FORCE`, `T_EMPLOYED` |
| 277 | census-occupation-2021 | Polygon | 16 | `YEAR`, `GEOGRAPHY`, `T_OCC_NA`, `T_OCC_MGMT`, `T_OCC_BUS_FIN_ADMIN` |
| 278 | census-occupation-2016 | Polygon | 16 | `YEAR`, `GEOGRAPHY`, `T_OCC_NA`, `T_OCC_MGMT`, `T_OCC_BUS_FIN_ADMIN` |
| 279 | census-unemployment | Polygon | 2 | `GEOGRAPHY`, `P_2006_2007`, `P_2007_2008`, `P_2008_2009`, `P_2009_2010` |
| 281 | heritage-properties | Point | 10,266 | `HERITAGE_STATUS`, `NAME`, `STREET_NO_1`, `STREET_NO_2`, `STREET_NAME` |
| 287 | census-dwellings-2021 | Polygon | 16 | `YEAR`, `GEOGRAPHY`, `T_DWELL`, `T_DWELL_1960BEFORE`, `T_DWELL_1961_1980` |

