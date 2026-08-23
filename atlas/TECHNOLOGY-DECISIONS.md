# Atlas — technology decisions

Why each tool and approach was chosen over its alternatives, with the
comparison that produced the decision. **Append, don't rewrite** — a superseded
decision stays visible with the date and reason it changed, so an incoming
developer or agent can see how we got here rather than only where we landed.

Companion to [ENVIRONMENT.md](ENVIRONMENT.md) (what is installed and what it
does) and the engine spec in `../docs/superpowers/specs/`.

**Format.** Each decision: the question, the options with their real
trade-offs, what was chosen, and what would change the answer.

---

## D-1 · Geometry engine — 2026-08-23

**Question.** What performs point-in-polygon, intersection and area across
~79,000 parcels and 231 source layers?

| Option | Makeup | Strengths | Weaknesses |
|---|---|---|---|
| **shapely 2.x** ✅ | Python over GEOS (C++), wheels bundle GEOS | Standard, well-tested; `STRtree` index built in since 2.0; vectorized ops via numpy; no system libs needed | Geometry only — no CRS handling, no file I/O |
| geopandas | pandas + shapely + pyogrio + pyproj | One API for read → project → join → write; expressive | Dataframe model wants whole layers in memory; pulls a heavy stack; **fights a streaming pipeline holding a 2.2 GB layer** |
| pure Python | hand-rolled ray casting, haversine | Zero dependencies | Correct for a demo, not for production. No index → 79k × constraint polygons is ~10⁹ operations. Area on a spheroid is easy to get subtly wrong |
| GDAL/OGR bindings | Python over GDAL | Everything, including formats | Heavy; awkward API; pyogrio covers our formats |

**Chosen: shapely 2.x**, used directly rather than through geopandas.

**Why not geopandas**, despite being the conventional choice: our largest layer
is 2.2 GB and the pipeline is deliberately streaming (see D-4). A dataframe
abstraction that wants the layer resident works against that, and the
convenience it buys is a few dozen lines.

**What would change this:** if the pipeline stopped streaming — because the
heavy layers were dropped at ingest (D-5) — geopandas would become reasonable
and would shorten `enrich.py` noticeably.

---

## D-2 · Spatial index — 2026-08-23

| Option | Verdict |
|---|---|
| **shapely `STRtree`** ✅ | Built into shapely ≥2.0, GEOS-backed, no extra dependency |
| `rtree` | Superseded. Needs system `libspatialindex`, which is **not installed**. Listed in an earlier draft of this design in error and withdrawn |

**Chosen: shapely `STRtree`.** Recorded because `rtree` was proposed before the
environment was checked — the correction is the point.

---

## D-3 · Projection — 2026-08-23

**Question.** Where does area and distance maths happen?

Source data is WGS84 (EPSG:4326), whose units are **degrees**. A square degree
is not a constant area, so area computed in WGS84 is wrong — and wrong
*plausibly*, producing numbers that look reasonable and are not.

**Chosen: UTM zone 17N (EPSG:32617)** for all area and distance work, via
pyproj. Covers the entire Hamilton–Niagara–Buffalo study area in one zone, so
no zone-straddling. Asserted at the pipeline boundary.

**Checkable, not assumed:** several publishers ship precomputed area
(`AREA_SQM` on Niagara Falls Official Plan, `GeometrySTArea` on Welland
zoning). Our computed areas must agree with theirs.

---

## D-4 · Fetching — amended 2026-08-23

**Original:** accumulate paged responses in memory, write once.

**Failed in practice.** On Hamilton Contour Lines (221,518 polylines) the
fetcher reached **4.7 GB RSS on a 7 GB machine with zero available** and was
killed. Every large layer was at risk; Niagara escaped only because no single
layer there was big enough.

**Amended:** features stream to disk as pages arrive. Same layer now runs at
**152 MB RSS**. A second pass fixed the skip path, which parsed a whole file
just to count features — now stream-counted with a marker of `"type":"Feature",`
(the trailing comma excludes the `FeatureCollection` header) and a chunk
overlap of exactly `len(marker)-1` so nothing is double-counted at a boundary.

**Standing rule:** no pipeline stage may hold a whole layer in memory unless it
has been shown that the layer is small.

---

## D-5 · Large-layer disposition — 2026-08-23

**Question.** We hold 4.91 GB across 200 layers. GitHub Pages serves from the
repo; GitHub's hard per-file limit is 100 MB and a repo should stay well under
1 GB. What actually ships?

**The distribution is extremely skewed:**

| | Files | Size | Share |
|---|---:|---:|---:|
| Two contour layers (#260, #114) | 2 | **3.11 GB** | **63%** |
| Files > 100 MB (GitHub hard limit) | 5 | 3.51 GB | 71% |
| Files > 50 MB | 14 | 4.20 GB | 86% |
| **Everything else** | **186** | **0.71 GB** | 14% |
| Files ≤ 10 MB | 163 | 0.16 GB | 3% |

**163 of 200 layers fit in 162 MB.** The weight is almost entirely in fourteen
files, and nearly two thirds of it in two.

### The disposition taxonomy

Every layer gets one of five dispositions, recorded in the manifest:

| Disposition | Meaning | Shipped? |
|---|---|---|
| `ship` | small enough as-is | yes |
| `simplify` | shipped as topology-simplified display geometry (mapshaper), precise version kept build-side | yes, reduced |
| `derive` | consumed at build, collapsed to attributes on units | **no** |
| `tile` | served as vector tiles for display at zoom | via tiles |
| `link` | referenced at source, not hosted | no |

### Contours are `derive`

**Contour lines are not an analysis input and barely a display need.** What an
industrial atlas actually wants from terrain is **slope and elevation**, which
are scalars, not 221,518 polylines.

From the contour layers, `enrich.py` computes per unit:

```
elev_min_m · elev_max_m · relief_m (= max − min) · slope_pct
```

Four floats — about 32 bytes per parcel. Across ~79,000 parcels that is
**≈ 2.5 MB, from 3.11 GB.** A reduction of roughly **1,200:1**, and the 2.5 MB
is the part anyone can actually use: *"this parcel falls 4 m across its length"*
is a siting fact; a contour polyline is not.

For visual terrain, see **D-10** — a hillshade basemap is an *optional* variant
rather than a default, because the escarpment is already vectorised (#255 plus
the NEP layers) and `slope_pct` answers the siting question. The basemap covers
only the aesthetic need.

**The contour GeoJSON stays in the local cache** (gitignored) as the input to
that derivation, and is re-pullable from the ledger endpoints. It is never
committed and never served.

### The other twelve heavy layers

`simplify` for display, precise build-side for analysis. The environmental
constraint layers are the extreme case — **#62 Provincial Natural Heritage
System is 137 KB per feature** across 51 polygons; #63 is 78 MB for 7,774. They
are geometrically dense because they trace natural boundaries, and they are
exactly the layers we most want to test containment against. Precision belongs
at build time; the browser gets a simplified outline.

**Consequence:** the shipped atlas should land in the low hundreds of MB, well
inside GitHub Pages' practical limits, while the analysis retains full
precision. This is the same separation the engine spec already requires between
display geometry and analysis attributes — D-5 is that principle applied to
concrete file sizes.

**What would change this:** if a genuinely large layer must be *displayed* at
full detail, the answer is `tile` — PMTiles, a single file served by HTTP range
requests, which works on static hosting. That still exceeds GitHub's 100 MB
file limit for the contour case, so it would mean hosting the tile file
elsewhere. Not needed for anything we currently hold.

---

## D-6 · Simplification tool — 2026-08-23

| Option | Makeup | Strengths | Weaknesses |
|---|---|---|---|
| **mapshaper** ✅ | Node CLI | **Topology-aware** — shared borders simplify identically on both sides | Extra runtime (Node already present) |
| shapely `.simplify()` | Douglas–Peucker per geometry | No new dependency; fine for isolated shapes | **Tears shared borders.** Adjacent zoning polygons simplified independently open slivers and overlaps |
| topojson (Python) | topology encoding | Topology-aware | Less mature; mapshaper is the reference implementation |

**Chosen: mapshaper** for anything that tiles (parcels, zoning, land use,
catchments); shapely `.simplify()` is acceptable for isolated geometries such
as individual constraint areas.

---

## D-7 · JSON parsing — 2026-08-23

| Option | Note |
|---|---|
| **orjson** ✅ | Rust; typically 2–5× stdlib; returns `bytes`; lower peak memory |
| ujson 5.7.0 | already installed; faster than stdlib but slower than orjson and less strict |
| stdlib `json` | the baseline; the current bottleneck at 4.9 GB |

**Chosen: orjson**, on volume grounds alone. Not architectural — the pipeline
is correct with stdlib `json`, just slower to iterate on.

---

## D-8 · Shapefile reading — 2026-08-23

| Option | Note |
|---|---|
| **pyogrio** ✅ | GDAL-backed, columnar, fast; bundles GDAL in the wheel |
| fiona | the older GDAL binding; record-at-a-time, slower; no reason to carry both |

**Chosen: pyogrio.** Required, not optional: three sources publish shapefiles
only (#24, #69, provincial PSEZ) and cannot be ingested otherwise.

---

## D-9 · Rejected without adoption — 2026-08-23

| Package | Why not |
|---|---|
| geopandas | D-1 |
| rtree | D-2 |
| fiona | D-8 |
| h3 | The public grid is 250 m squares in UTM 17N (engine spec §6.3); pyproj covers it. Hex indexing solves a problem we do not have |
| GDAL Python bindings | Heavy; pyogrio covers our formats |
| PostGIS / any database | The atlas is deliberately static, pre-generated GeoJSON on GitHub Pages. A database would be the right answer for interactive server-side queries, which the architecture explicitly rejects (engine spec §11) |

---

## D-10 · Basemap and terrain — 2026-08-23

**Question.** How is terrain represented, and on what basemap?

**Context.** `map.js:30` already states the working decision: *"A muted basemap
is a working decision, not a style one … a standard colour basemap spends all
its contrast on roads and [labels]."* CARTO dark is in place. External raster
tiles are therefore already accepted architecture — the question is which, and
whether terrain earns a place.

### Terrain: mostly answered without a basemap

| Need | Answered by | Cost |
|---|---|---|
| "Is this parcel awkward to build on?" | `slope_pct`, `relief_m` — derived attributes (D-5) | ~32 bytes/unit |
| "Where is the escarpment?" | #255 Escarpment, plus NEP boundary / policy area / land-use designations | already held |
| "What does the land feel like?" | a hillshade — **the only need nothing else covers** | see below |

Only the third row is a genuine gap, and it is aesthetic rather than
analytical. **Hillshade is therefore an optional basemap variant, never a
default layer** — an always-on shaded raster would add ambient texture across
the whole viewport, which is precisely what the muted-basemap decision rejects.

### Basemap options

| Option | Auth | Trade-offs |
|---|---|---|
| **CARTO dark** (current) | none | muted by design; no terrain |
| **Stadia** (Stamen Terrain, Alidade Smooth Dark) | **domain-based, no key** | styles are strong; adds a third-party dependency and a terms-of-service relationship |
| Esri World Hillshade | none, attribution required | free, zero setup; `{z}/{y}/{x}` tile order, not the usual `{z}/{x}/{y}` |
| OpenTopoMap | none | contours *and* hillshade baked in; cartographically busy, fights the muted intent |
| Mapbox / MapTiler terrain-RGB | API key | GPU hillshade from encoded elevation — a **MapLibre/Mapbox GL** feature. Leaflet 1.9 has no equivalent, so this means changing map library |
| **Self-hosted** (NRCan CDEM or Ontario DEM) | none | full independence. `gdaldem hillshade` → tile pyramid. Study area z10–14 ≈ 2,700 greyscale tiles ≈ **55 MB** — feasible. z15 alone would add ~165 MB, so cap the zoom range |

### On API keys in a static site

Recorded because the question recurs and the intuition is wrong.

**GitHub Actions secrets do not protect a client-side map key.** Secrets are
available at *build* time; injecting one into the built JavaScript makes it
readable by anyone with view-source. The benefit is real but narrow — the key
stays out of git history and can be rotated without a source commit — and it is
**not** confidentiality.

**What actually protects a browser tile key is domain restriction.**

**Stadia supports domain-based authentication with no API key at all.** Their
documentation calls it the recommended production method: the service validates
the `Origin` and `Referer` headers the browser sets itself, which JavaScript
cannot forge. Register `niagaraassembly.com` in the Stadia dashboard and the
map authenticates with **nothing in the source at all** — no key, no secret, no
rotation, no Action step. `localhost` needs no authentication either, so local
development works unchanged.

**One dependency this creates:** domain auth relies on the browser sending
`Origin`/`Referer`. The site currently sets **no `Referrer-Policy`**, so the
browser default (`strict-origin-when-cross-origin`) sends the origin on
cross-origin requests — which is what Stadia needs. **Adding
`Referrer-Policy: no-referrer` at any point would silently break the basemap.**
Recorded here so that change is made knowingly.

**Chosen (amended 2026-08-23): both.** CARTO dark stays the default; a basemap
switcher offers Stadia's styles *and* a self-hosted NRCan hillshade. See D-11
for the basemap catalogue and D-12 for how the hillshade is produced.

**What would change this:** a move to MapLibre would make terrain-RGB with GPU
hillshade the better option, and would also open vector basemaps. That is a
larger change than terrain alone justifies.


---

## D-11 · Basemap catalogue — 2026-08-23

**Question.** Which basemaps does the switcher offer?

The muted default is a *working* decision (D-10), not a claim that one basemap
suits every task. A satellite backdrop suits site inspection; a terrain
backdrop suits reading the escarpment; Toner suits printing. Offering several
adds real analytical range, provided the default stays quiet.

### Stadia — domain-authenticated, no API key

Verified against Stadia's own documentation 2026-08-23. Registering
`niagaraassembly.com` authenticates browser requests via `Origin`/`Referer`;
**nothing goes in the source**. `localhost` needs no auth, so development is
unchanged.

| Style | Character | Use here |
|---|---|---|
| **Stamen Terrain** | hill shading + natural vegetation colouring | the escarpment, read as landform |
| **Stamen Toner** | high-contrast black and white | print, and maximum overlay contrast |
| **Stamen Watercolor** | hand-drawn washes over paper texture | narrative and presentation use |
| **Alidade Smooth Dark** | muted dark, low POI density | closest analogue to the CARTO dark default |
| **Alidade Smooth** | muted light | light-mode equivalent |
| **Alidade Satellite** | imagery with labels and outlines | site inspection — what is actually on the ground |
| **Stadia Outdoors** | OSM Bright derivative, trails and terrain | recreational context |
| **OSM Bright** | full-colour general purpose | orientation and street detail |

**The dependency this creates.** Domain auth relies on the browser sending
`Origin`/`Referer`. The site sets **no `Referrer-Policy`**, so the default
(`strict-origin-when-cross-origin`) sends it. **Adding
`Referrer-Policy: no-referrer` would silently break every Stadia style.**

**And the honest trade-off:** eight styles is a terms-of-service relationship
and a per-tile call to a third party. Stamen's own tiles moved to Stadia in
2023 — the same thing could happen again. D-12 exists so at least one terrain
option survives that.

---

## D-12 · Hillshade production — 2026-08-23

**Question.** If we self-host terrain, where does the elevation come from and
at what resolution?

### Resolution decides everything

| Source | Res | Study area (110 × 60 km) raw float32 |
|---|---:|---:|
| Ontario Lidar DTM (bare earth) | **1 m** | **26.4 GB** |
| — | 10 m | 0.3 GB |
| **NRCan MRDEM** | **30 m** | **0.03 GB** |

Local disk free is 5.7 GB and the source cache already holds 4.9 GB, so the 1 m
product is not merely wasteful — it is impossible here.

**And it would be wasted anyway.** At zoom 14 one screen pixel is about 7 m at
this latitude. A 1 m DEM carries seven times more detail than the highest zoom
the hillshade will ever be drawn at. Resolution beyond the display resolution
is storage spent on nothing.

### NRCan MRDEM, and it already ships a hillshade

- **30 m, complete national coverage**, extending across the border for shared
  watersheds — which suits an atlas that deliberately spans one
- **Open Government Licence – Canada**
- Vertical datum CGVD2013 / CGG2013 geoid
- Published as **DTM, DSM *and* a precomputed hillshade**, as GDAL VRTs on S3,
  with a **STAC API** and **WMS**
- NRCan's own note: *"files in this dataset are designed for streaming, not
  downloading"*

**We therefore do not run `gdaldem hillshade` at all.** The hillshade is
already produced, by the agency that owns the elevation data, to a national
standard. We read their VRT for our bounding box and cut an XYZ tile pyramid.

Estimated output: zoom 10–14, ~2,700 greyscale PNG tiles, **≈55 MB** — inside
GitHub's limits and committable. Zoom 15 alone would add ~165 MB, so the
pyramid is capped and higher zooms fall through to the vector layers, where the
escarpment already exists as #255 plus the NEP designations.

### Ontario's lidar DTM is not rejected — it is reassigned

The 1 m bare-earth DTM is the better product for **analysis**, and analysis is
where per-metre accuracy actually changes an answer. But we do not need to
download it: **the contour layers already held (#114, #260) are derived from
the same lidar** at 1 m interval, and D-5 already collapses them to
`elev_min_m`, `elev_max_m`, `relief_m`, `slope_pct` per unit.

So the split is:

| Purpose | Source | Resolution | Cost |
|---|---|---|---|
| **Analysis** — slope, relief per unit | contours already cached (#114, #260) | 1 m lidar-derived | none, already held |
| **Display** — hillshade basemap | NRCan MRDEM hillshade | 30 m | ~55 MB of tiles |

Fine where it changes a decision, coarse where it only has to look right.

**What would change this:** if the atlas ever needed terrain analysis beyond
per-unit slope — cut-and-fill volumes, viewsheds, drainage modelling — the
Ontario lidar DTM becomes necessary and brings a storage problem that needs
solving on its own terms.

---

## Amendment log

- **2026-08-23** — Document created. D-1…D-12 recorded.
  D-10 amended the same day: the basemap offering widens to Stadia's eight
  styles plus a self-hosted NRCan hillshade, rather than one optional terrain
  layer. D-4 amended the same day
  after the in-memory fetcher hit 4.7 GB RSS and was killed.
