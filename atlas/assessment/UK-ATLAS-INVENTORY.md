# Industrial Atlas UK — Stage 1 Prior-Art Inventory

**Source repo:** https://github.com/babbworks/atlas (public, default branch `master`)  
**Live host signal:** `CNAME` → `atlas.babb.tel`  
**Assessment date:** 2026-09-14  
**Method:** Raw GitHub + public tree listing (no clone). Inventory only — no redesign.  
**Taxonomy tags:** `Implemented` | `Generated` | `Cached` | `Designed` | `Proposed` | `Abandoned`

---

## LIABILITY — Committed secrets / API keys

| Path | Line | Type | Value | Severity |
|------|------|------|-------|----------|
| `server.py` | 24 | Companies House REST API key (UUID) | `***REDACTED***` | **Critical** — live key committed in public repo |
| `server.py` | 26 | Derived HTTP Basic auth (`base64(key:)` ) | `***REDACTED***` | Same credential, derived form |

**Impact:** Anyone can call Companies House REST API as this key until revoked. Client `companies.js` expects a local proxy at `/api/ch`; the secret is only needed for `python3 server.py` local/dev use, but the key is still exposed in source.

**Immediate actions:** See `/workspace/atlas-assessment/UK-SECRET-LOCATIONS.md` (revoke, rotate, env-inject, history purge).

**Other credential scan (negative):** No CH key in `companies.js`, HTML, Workers, or scripts. Public dataset UUIDs in `scripts/process_epr.py` / `system/datasets.md` are not secrets.

---

## Licensing & attribution signals

| Tag | Path | Note |
|-----|------|------|
| Implemented | `README.md` (Attribution) | OSM © contributors, **ODbL**; Overpass by Roland Olbricht; Esri satellite; CartoDB inset tiles |
| Implemented | `index.html` ~245 | Welcome panel: “Map data © OpenStreetMap contributors, ODbL” |
| Implemented | `map.js:102–115` | OSM tile attribution; Esri World Imagery attribution |
| Implemented | `map.js:198–199` | Inset: CartoCDN `light_nolabels` tiles |
| Implemented | `inspire.js:7` | HMLR INSPIRE polygons: **OGL**, England & Wales, no auth |
| Implemented | `inspire-proxy/worker.js:7–8` | Upstream INSPIRE free/public/OGL; Worker adds CORS only |
| Designed | `system/datasets.md` | Documents OGL for Companies House, NHLE, INSPIRE, Planning Data, VOA, BRES |
| Proposed | `README.md` Planned | NLS historic tiles (third-party licence TBD if implemented) |

**ODbL implication:** Derived OSM geometry/tags in exports (CSV/PNG) and any redistributed Overpass results inherit ODbL share-alike / attribution duties.

---

## Tag-count summary

| Tag | Count |
|-----|------:|
| Implemented | 95 |
| Generated | 13 |
| Cached | 10 |
| Designed | 16 |
| Proposed | 13 |
| Abandoned | 5 |
| **Total inventory rows** | **152** |

*(Counts are taxonomy applications across inventory rows below; a single file may appear under multiple rows/sections.)*

---

## 0. Repo tree map

```
atlas/ (master)
├── index.html, styles.css, app.js, map.js, overpass.js, scoring.js
├── companies.js, planning.js, voa.js, voa_geo.js, fsa.js, epr.js
├── strategy_zones.js, inspire.js, server.py, CNAME, README.md, .gitignore
├── property.html, property-map.html
├── data/
│   ├── epr_permits.json, fsa_food_industry.json, voa_geo.json
│   ├── strategy_zones.geojson
│   └── voa/{AREA}.json          # 106 postcode-area shards
├── scripts/
│   ├── process_voa.py, split_voa.py, geocode_voa.py
│   ├── process_epr.py, process_fsa.py
├── inspire-proxy/
│   ├── worker.js, wrangler.toml
└── system/
    ├── datasets.md, project-notes.md
```

| Tag | Path | Note |
|-----|------|------|
| Implemented | (root static site) | No `package.json`; no build step; open `index.html` or serve statically |
| Implemented | `CNAME` | Custom domain `atlas.babb.tel` |
| Implemented | `.gitignore` | Ignores raw `*.zip`/`*.accdb`, monolithic `data/voa_industrial.json`, Worker tooling |
| Designed | README File Structure | Understates tree (omits companies/planning/VOA/EPR/FSA/property pages/scripts/data) |

---

## 1. Architecture

| Tag | Path | Note |
|-----|------|------|
| Implemented | `README.md` Architecture; `app.js` | Orchestrator `App` → `MapModule` + Overpass + optional layers |
| Implemented | `index.html:322–337` | Script load order: html2canvas, Leaflet stack, then domain modules, `app.js` last |
| Implemented | `server.py` | Local static server + Companies House CORS/auth proxy on `:8000` |
| Implemented | `system/project-notes.md` | Documents pure frontend + Leaflet + Overpass + Nominatim; notes scoring is OSM-only |
| Designed | `system/datasets.md` Integration Priority | Phased plan for NHLE / VOA / CH / planning / INSPIRE / BRES |
| Proposed | `README.md` Planned / Future | Historic overlays, heatmap, CH SIC layer, VOA, employment land, self-hosted Overpass, GeoJSON/CSV export *(CSV now Implemented — README stale)* |

---

## 2. Map stack

| Tag | Path | Note |
|-----|------|------|
| Implemented | `index.html:11–14,323–325` | Leaflet 1.9.4, MarkerCluster 1.5.3, Leaflet.Draw 1.0.4 via unpkg/cdnjs |
| Implemented | `map.js:8–14` | UK centre zoom 6; min 5 / max 19; Run Query requires zoom ≥ 10 |
| Implemented | `map.js:102–115` | Base layers: OSM raster + Esri World Imagery |
| Implemented | `map.js:169–255` | Second Leaflet inset navigator with Carto light tiles + viewport rect sync |
| Implemented | `map.js:16–43` | 13 named UK region rectangles (click-to-zoom) |
| Implemented | `map.js:45–54` | `GEO_PRESETS` for 8 industrial districts |
| Implemented | `map.js:261–288` | Leaflet.draw rectangle for area analysis |
| Implemented | `map.js:291–347` | Clustered point markers + polygon landuse/building footprints |
| Implemented | `map.js:374–453` | Planning overlay rendering (points/polygons, flood level colours) |
| Implemented | `map.js:545–587` | VOA gap/matched marker rendering |
| Designed | `map.js:56–67` | Feature type colour/abbr style table |

---

## 3. Data sources

| Tag | Path | Note |
|-----|------|------|
| Implemented | `overpass.js:6` | Live OSM via `https://overpass-api.de/api/interpreter` |
| Implemented | `planning.js:10` | `https://www.planning.data.gov.uk` entity API (England) |
| Implemented | `companies.js:12` + `server.py:25` | Companies House via local proxy → `api.company-information.service.gov.uk` |
| Implemented | `app.js:867` | Nominatim geocode (`countrycodes=gb`) |
| Implemented | `data/voa/*.json` + `voa.js` | Cached VOA industrial ratings by postcode area |
| Implemented | `data/voa_geo.json` + `voa_geo.js` | Geocoded VOA postcode centroids for gap finder |
| Implemented | `data/fsa_food_industry.json` + `fsa.js` | FSA manufacturers/distributors/importers |
| Implemented | `data/epr_permits.json` + `epr.js` | EA Environmental Permitting industrial sites |
| Implemented | `data/strategy_zones.geojson` + `strategy_zones.js` | Hand-curated strategy zones / freeports / investment zones (29 features) |
| Implemented | `inspire.js` | HMLR INSPIRE WFS title polygons (via Cloudflare Worker URL) |
| Generated | `scripts/process_voa.py` | Builds `data/voa_industrial.json` from VOA rating list ZIP |
| Generated | `scripts/split_voa.py` | Splits into `data/voa/{AREA}.json` (106 areas) |
| Generated | `scripts/geocode_voa.py` | postcodes.io bulk → `data/voa_geo.json` |
| Generated | `scripts/process_epr.py` | EA ZIP download → `data/epr_permits.json` |
| Generated | `scripts/process_fsa.py` | FSA Hygiene API → `data/fsa_food_industry.json` |
| Designed | `system/datasets.md` §2 | Historic England NHLE — documented, not wired in UI |
| Designed | `system/datasets.md` §6 | ONS BRES employment — documented, not wired |
| Proposed | `README.md` Planned | Self-hosted Overpass; National Library of Scotland historic tiles |
| Proposed | `system/datasets.md` Phase 3 | BRES choropleth; fuller INSPIRE productisation |

---

## 4. Ingestion / offline processing

| Tag | Path | Note |
|-----|------|------|
| Implemented | `scripts/process_voa.py` | Filters industrial primary description codes (`I*`), indexes by postcode |
| Implemented | `scripts/split_voa.py` | Browser-friendly area shards; monolithic file gitignored |
| Implemented | `scripts/geocode_voa.py` | Resumable bulk geocode (100/batch, save every 20) via postcodes.io |
| Implemented | `scripts/process_epr.py` | Downloads EA industrial sites ZIP, sector keyword classify, lat/lng JSON |
| Implemented | `scripts/process_fsa.py` | BusinessTypeIds 7839/7/14; `x-api-version: 2` header |
| Generated | `data/voa/` (106 files) | Committed derived VOA lookup shards |
| Generated | `data/voa_geo.json` (~3.4 MB) | Committed geocoded gap-finder index |
| Generated | `data/epr_permits.json` (~2.8 MB) | Committed EPR points |
| Generated | `data/fsa_food_industry.json` (~1.8 MB) | Committed FSA points (~10.5k claimed in `fsa.js` header) |
| Generated | `data/strategy_zones.geojson` | Hand-authored polygons (not script-generated) |
| Abandoned | `.gitignore:7` `data/voa_industrial.json` | Intermediate monolith intentionally not served / not committed |

---

## 5. APIs & networking

| Tag | Path | Note |
|-----|------|------|
| Implemented | `overpass.js:126–167` | POST Overpass QL; 30s timeout; cap 1000 elements |
| Implemented | `planning.js:138–200` | GET entity.json with dataset+bbox; limit 500 |
| Implemented | `companies.js:45–62` | GET `/api/ch/...` search + company + officers |
| Implemented | `server.py:31–61` | Proxies `/api/ch/*`, injects Basic auth, CORS `*` |
| Implemented | `inspire.js:169–193` | WFS GetFeature `inspire:BasicPropertyUnit`, BNG bbox, GML2 |
| Implemented | `inspire-proxy/worker.js` | Cloudflare Worker CORS + 5 min edge cache |
| Designed | `inspire.js:15` | Worker URL placeholder `REPLACE_WITH_YOUR_SUBDOMAIN` — deploy required |
| Implemented | `inspire-proxy/wrangler.toml` | Worker name `inspire-proxy`, compatibility_date 2025-06-01 |
| Cached | `overpass.js:10–12,134–137` | In-memory session cache 15 min TTL, max 60 keys |
| Cached | `companies.js:13–14,45–60` | Map cache 10 min TTL, max 60 |
| Cached | `planning.js:12–13,150–152` | Map cache 15 min TTL, max 40 |
| Cached | `voa.js:11–61` | Per-area JSON fetch cache + failed-area set |
| Cached | `voa_geo.js:26–49` | One-shot load of `voa_geo.json` |
| Cached | `fsa.js` / `epr.js` / `strategy_zones.js` | Lazy-load module-level data caches |
| Cached | `inspire-proxy/worker.js:49` | CF `cacheTtl: 300` on upstream WFS |

---

## 6. Property / company intelligence

| Tag | Path | Note |
|-----|------|------|
| Implemented | `companies.js` | Postcode-exact filter + name search; SIC industrial highlight (div 5–43); enrich top 5 actives with SIC + officers |
| Implemented | `app.js:408–502` | Feature panel “Registered Businesses”; CH badges into score UI |
| Implemented | `voa.js` + `app.js:504–565` | Postcode VOA industrial entries (code/label/RV/band/address) |
| Implemented | `inspire.js` + `index.html` ext-layer | Title boundary polygons (zoom ≥ 14); tooltip INSPIRE ID |
| Implemented | `property.html` | Deep-link property dossier: Overpass fetch by OSM id, scoring, notes, Street View link, printable |
| Implemented | `property-map.html` | Map-centric property view sibling (Leaflet + scoring + Overpass) |
| Designed | `system/datasets.md` §1 | Caveat: registered address ≠ trading address |
| Proposed | `README.md` / `project-notes.md` | Historic “Companies House SIC layer” — partially superseded by live CH panel |
| Proposed | `system/datasets.md` Phase 2 | Fuller CH address matching / geocode join |

---

## 7. Geography & coverage

| Tag | Path | Note |
|-----|------|------|
| Implemented | `map.js:14–43` | UK bounding box + regional partitions incl. NI / Highlands |
| Implemented | `index.html:55–66` | Quick Areas UI wired to presets |
| Implemented | `app.js:1726–1740` | Planning coverage warning when viewport outside England |
| Implemented | `planning.js:5–6` | Explicit England-only API; Scotland/Wales separate |
| Implemented | `voa.js:7` / `inspire.js:7` | England & Wales for VOA / INSPIRE |
| Implemented | `strategy_zones.js` + geojson | UK industrial strategy / freeport / investment zone polygons |
| Designed | `system/datasets.md` | Scotland equivalents noted (HES, RoS, SAA) — not integrated |
| Proposed | `project-notes.md:39` | “No Scotland-specific data sources integrated yet” |

---

## 8. Scoring / opportunity model

| Tag | Path | Note |
|-----|------|------|
| Implemented | `scoring.js` | Probabilistic opportunity score 0–100; bands active→high |
| Implemented | `scoring.js:82–206` | Tag baselines, area from polygon, lifecycle boosts, activity penalties, age, absence, notes |
| Implemented | `scoring.js:208–254` | Spatial context vs loaded elements (100/250/500 m radii) |
| Implemented | `scoring.js:256–293` | Planning designation deltas (listed, Article 4, brownfield, flood, etc.) |
| Implemented | `scoring.js:299–313` | Confidence metric from tag richness + context |
| Implemented | `app.js` results chips | Filter/sort by score, lifecycle-only, area bands |
| Designed | `scoring.js:3–5` | Explicit non-claim of vacancy; OSM-only probabilistic framing |
| Proposed | `datasets.md` | Heritage / VOA / BRES as future scoring signals (NHLE/BRES not yet in `scoring.js`) |

---

## 9. Search & filters

| Tag | Path | Note |
|-----|------|------|
| Implemented | `overpass.js:16–88` | `FILTER_MAP`: workshops, manufacturing, buildings, landuse, craft, abandoned/disused/vacant |
| Implemented | `index.html:69–115` | Checkbox UI for productive / building / land / lifecycle filters |
| Implemented | `app.js:8–12` | Mode presets: workshop-explorer, urban-manufacturing, hidden-industry |
| Implemented | `app.js:864–907` | Nominatim search with suggestions |
| Implemented | `index.html:117–163` | Planning overlay checkboxes (7 datasets) |
| Implemented | `index.html:165–193` | External layers: FSA, EPR, strategy zones, INSPIRE |
| Implemented | `app.js:618–743` | VOA Gap Finder: VOA postcodes vs OSM industrial within 60 m |

---

## 10. UX / UI

| Tag | Path | Note |
|-----|------|------|
| Implemented | `styles.css` | Three-column layout, IBM Plex, panels, CH/VOA styles, mobile FABs |
| Implemented | `index.html` | Left filters / centre map / right panels (welcome, results, feature, analysis, gaps) |
| Implemented | `app.js:909–936` | URL hash state: view, filters, mode |
| Implemented | `app.js:745–862` | Draw-area analysis panel |
| Implemented | `app.js:945–1697` | Postcard / minimal card formats; html2canvas PNG download; Web Share API when available |
| Implemented | `index.html:319–320` | Mobile FAB toggles for sidebars |
| Implemented | `app.js:1821+` | `file://` protocol warning (tiles/CORS) |
| Designed | `README.md` Navigation flow | Region click → zoom ≥10 → Run Query → detail panel |

---

## 11. Exports & sharing

| Tag | Path | Note |
|-----|------|------|
| Implemented | `app.js:567–615` | CSV export: id, type, name, feature_type, lat/lon, area, score, classification, lifecycle, postcode, osm_url |
| Implemented | `app.js` postcard/card | PNG via html2canvas; optional share |
| Implemented | `app.js:909+` / Share Link btn | Hash URL sharing |
| Proposed | `README.md` Planned | “Export results as GeoJSON / CSV” — CSV done; **GeoJSON export not found** |
| Abandoned | (implicit) | README still lists CSV as future — documentation drift |

---

## 12. Provenance & documentation

| Tag | Path | Note |
|-----|------|------|
| Implemented | `README.md` | Product overview, run/deploy, architecture, Overpass usage, extending, attribution |
| Implemented | `system/project-notes.md` | Stack, what works, design decisions, limitations, next directions |
| Implemented | `system/datasets.md` | Six UK public datasets with access URLs, licences, caveats, priority phases |
| Designed | `overpass.js:169–198` | `classify` / `displayName` / `lifecycleStatus` as OSM tag provenance helpers |
| Designed | Feature panel OSM links | External OSM object URLs in CSV and UI |
| Proposed | `datasets.md` Phase 1 | NHLE overlay “no auth” — still Proposed relative to code |

---

## 13. Ops / deployment

| Tag | Path | Note |
|-----|------|------|
| Implemented | `README.md` Deployment | Static host / GitHub Pages / Netlify / Cloudflare Pages; no backend required for core map |
| Implemented | `CNAME` | GitHub Pages custom domain |
| Implemented | `server.py` | Required for Companies House panel (auth proxy); not used by pure static deploy |
| Implemented | `inspire-proxy/` | Optional Cloudflare Worker for INSPIRE CORS |
| Designed | `.gitignore` | Keeps raw downloads and Worker local state out of git |
| Proposed | `README.md` | Self-hosted Overpass `ENDPOINT` change in `overpass.js` |

---

## 14. Cross-cutting inventory rows (by capability)

### Overpass query capability
| Tag | Citation | Note |
|-----|----------|------|
| Implemented | `overpass.js:90–113` | QL builder with key/value and key-regex (`abandoned:`, `disused:`) |
| Implemented | `overpass.js:150–158` | Truncation flag when >1000 elements |
| Cached | `overpass.js` cache key | `filters|bbox` |

### Planning designations
| Tag | Citation | Note |
|-----|----------|------|
| Implemented | `planning.js:15–60` | LAYER_DEFS for 7 datasets |
| Implemented | `planning.js:205–229` | `nearbyDesignations` PIP / 80 m for scoring |
| Cached | `planning.js` | bbox+datasets cache |

### External industrial registers
| Tag | Citation | Note |
|-----|----------|------|
| Implemented | `epr.js` | Sector-coloured clustered markers; inactive permits faded |
| Implemented | `fsa.js` | Type-coloured clusters; hygiene rating in popup |
| Generated | scripts + `data/*` | Offline ETL into committed JSON |

### Strategy geography
| Tag | Citation | Note |
|-----|----------|------|
| Implemented | `strategy_zones.js:13–17` | Styles for industrial-strategy-zone / freeport / investment-zone |
| Generated | `data/strategy_zones.geojson` | 10 strategy + 8 freeport + 11 investment (approx. from type list) |

---

## 15. Notable documentation / code mismatches (inventory only)

| Tag | Path | Note |
|-----|------|------|
| Abandoned | `README.md` File Structure | Lists only 5 JS/CSS files; repo has many more modules |
| Abandoned | `README.md` Planned “Export CSV” | CSV already Implemented in `app.js` |
| Designed | `project-notes.md:13` | Says “No backend” — true for static map; false when using CH via `server.py` |
| Proposed | `README.md` “Companies House SIC code layer” | Live CH search panel exists; map-wide SIC layer does not |

---

## Appendix A — Primary file sizes (tree listing)

| File | ~Size |
|------|------:|
| `app.js` | 84 KB |
| `styles.css` | 45 KB |
| `map.js` | 21 KB |
| `property-map.html` | 21 KB |
| `index.html` / `property.html` | ~19 KB |
| `scoring.js` | 14 KB |
| `inspire.js` | 10 KB |
| `overpass.js` | 7 KB |
| `planning.js` | 7 KB |
| `companies.js` | 5 KB |
| `data/voa_geo.json` | 3.4 MB |
| `data/epr_permits.json` | 2.8 MB |
| `data/fsa_food_industry.json` | 1.8 MB |
| `data/voa/*.json` | 106 shards (KB–MB each) |

---

## Appendix B — Taxonomy legend (applied meaning)

| Tag | Meaning in this inventory |
|-----|---------------------------|
| **Implemented** | Present in committed runtime code or UI and operable as designed |
| **Generated** | Derived artefact or ETL script output (committed JSON/GeoJSON or producer script) |
| **Cached** | Explicit client/edge cache of remote or loaded data |
| **Designed** | Documented architecture, style tables, or integration design not fully productised |
| **Proposed** | README / notes “planned / next / phase” items not fully present in code |
| **Abandoned** | Intentionally dropped intermediate, or docs superseded by newer implementation |

---

*End of Stage 1 inventory. No product redesign performed.*
