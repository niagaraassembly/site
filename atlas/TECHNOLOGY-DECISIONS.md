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

For visual terrain, use an **external hillshade basemap tile source**. It costs
no repo space, is better cartography than raw contour lines, and terrain relief
is exactly the kind of context a basemap is for.

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

## Amendment log

- **2026-08-23** — Document created. D-1…D-9 recorded. D-4 amended the same day
  after the in-memory fetcher hit 4.7 GB RSS and was killed.
