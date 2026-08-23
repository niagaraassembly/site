# Atlas — environment, packages and dependencies

What the Atlas is built and run with, what each package is for, and what role
it plays here specifically. Amend when anything is added or removed.

**Status: installed and verified 2026-08-23.** See §5 for the verification
results. `scripts/fetch_candidates.py`, `update_ledger.py` and
`inspect_cache.py` run on the standard library alone and will continue to — the
venv is for the enrichment pipeline, not the fetchers.

Companion to [TECHNOLOGY-DECISIONS.md](TECHNOLOGY-DECISIONS.md), which records
*why* these were chosen over the alternatives.

---

## 1. Environments

| | |
|---|---|
| Python | **3.11.2** (system, Debian) |
| Package state | **PEP 668 externally-managed** — `/usr/lib/python3.11/EXTERNALLY-MANAGED` present |
| Consequence | System Python must not be pip-installed into. All Atlas packages go in a **project venv at `atlas/.venv`** |
| Node | **v20.20.2**, npm **10.8.2** |
| System geo libs | **none** — no `libgeos`, `libproj`, `libgdal`, `libspatialindex`. Modern Python wheels bundle their own copies, so no `apt` work is required |
| Disk | 5.7 GB free; local cache is already 4.9 GB |

**Why a venv rather than `--break-system-packages`.** The marker file exists
because Debian's own tooling depends on the system site-packages; overwriting
a shared library there can break unrelated system packages. A venv inside the
repo is reversible — delete the directory and nothing else changed — and it
pins the Atlas to known versions independently of whatever the OS ships.

`atlas/.venv/` must be gitignored.

### Already present system-wide

Available without installing anything. Listed because scripts may rely on them
and because they constrain version choices.

| Package | Version | Note |
|---|---|---|
| numpy | 2.4.6 | satisfies shapely's only hard dependency |
| pandas | 3.0.3 | not used by the pipeline; see TECHNOLOGY-DECISIONS §2 |
| ujson | 5.7.0 | superseded by orjson for our volumes |
| requests | 2.34.2 | not used — the fetcher uses `urllib` from the stdlib |

---

## 2. Installed packages

### Python — `atlas/.venv`

Installed versions: **shapely 2.1.2 · pyproj 3.7.2 · pyogrio 0.13.0 ·
orjson 3.12.0 · rasterio 1.4.4**, with numpy 2.4.6, certifi, packaging,
attrs, click, cligj, click-plugins, affine, pyparsing pulled transitively.

#### shapely (2.x)
**Generally:** the standard Python interface to GEOS, the geometry engine
behind PostGIS and QGIS. Provides points, lines and polygons, and the
predicates and operations over them — contains, intersects, intersection,
area, buffer, simplify — plus `STRtree`, an R-tree spatial index.

**Role in the Atlas:** the whole of `enrich.py`. Every constraint fraction is
a polygon intersection; every "is this parcel inside a sewer catchment" is a
containment test; every distance-to-rail is a nearest-neighbour query over an
index. Without it, the enrichment stage is thousands of lines of hand-rolled
computational geometry that would be wrong in ways nobody notices.

`STRtree` is what makes the joins tractable: testing 79,000 parcels against
constraint layers pairwise is ~10⁹ operations; indexed it is minutes.

#### pyproj
**Generally:** Python bindings to PROJ, the coordinate-transformation library.
Converts between coordinate reference systems and computes geodetic distances.

**Role in the Atlas:** every area and distance number depends on it. Source
data arrives in WGS84 (EPSG:4326), whose units are degrees — a "square degree"
is not a constant area, so **any area computed in WGS84 is wrong**, and wrong
plausibly rather than obviously. The engine spec puts all area maths in
**UTM zone 17N (EPSG:32617)**, which covers the whole Hamilton–Niagara study
area. pyproj is what performs that transform, and it also defines the 250 m
public grid.

#### pyogrio
**Generally:** a fast reader/writer for vector geospatial files, built on
GDAL/OGR with a columnar interface.

**Role in the Atlas:** three sources publish **shapefiles only** and cannot be
ingested without it — Lincoln zoning (#24), Lincoln Aquatic Species at Risk
(#69), and the provincial PSEZ package (a ZIP of shapefiles). It also reads
File Geodatabases, which several ArcGIS publishers offer as an alternative
download.

#### orjson
**Generally:** a JSON parser/serializer written in Rust; typically 2–5× faster
than the standard library and materially more memory-efficient, returning
`bytes` rather than `str`.

**Role in the Atlas:** we hold **4.9 GB of GeoJSON** and the pipeline reads it
repeatedly — normalize, enrich, change-detect, emit. Parse time is a real cost
at that volume, and stdlib `json` is the bottleneck. Not architecturally
essential; it makes the build practical to iterate on.

#### rasterio *(added for the hillshade pipeline)*
**Generally:** reads and writes geospatial raster formats on top of GDAL, with
a numpy-array interface. Handles GeoTIFF, Cloud-Optimized GeoTIFF and GDAL VRT,
including remote ones over HTTP.

**Role in the Atlas:** reads NRCan's MRDEM hillshade VRT for the study-area
bounding box (D-12) and writes the clipped raster the tiler consumes. NRCan
publish the VRT for streaming, so this reads a window rather than downloading a
national dataset.

**Only needed if the self-hosted hillshade is built.** The Stadia basemaps need
no Python at all.

#### gdal2tiles *(ships with GDAL, invoked via rasterio's GDAL or the CLI)*
Cuts the clipped hillshade into an XYZ tile pyramid for Leaflet. Alternative:
`rio-mbtiles` / PMTiles if a single-file tileset is preferred over ~2,700 loose
PNGs — decide when building, not now.

### Node — `atlas/node_modules` (project-local, not global)

Installed via `package.json` as a devDependency and invoked with
`npx mapshaper`. Project-local for the same reason as the venv: reversible, and
nothing outside the repo changes. **mapshaper 0.6.121.**

#### mapshaper
**Generally:** a command-line tool for editing and simplifying vector GIS
data, best known for **topology-aware** simplification.

**Role in the Atlas:** display simplification for polygon layers that tile
without gaps — parcels, zoning, land-use, sewer catchments. Shapely's
`.simplify()` is Douglas–Peucker applied to one geometry at a time, so two
adjacent polygons sharing a border have that border simplified *differently on
each side*, opening visible slivers and overlaps. Mapshaper simplifies the
shared topology, so neighbours stay coincident.

This matters because the engine spec requires aggressive display
simplification, and the layers most in need of it are exactly the ones that
tile.

---

## 3. Total footprint

| | |
|---|---|
| Python packages | shapely · pyproj · pyogrio · orjson |
| Python, hillshade only | rasterio (+ GDAL, bundled in the wheel) |
| Transitive additions | certifi, packaging (small) |
| Node packages | mapshaper |
| Estimated disk | 150–200 MB in `atlas/.venv`, plus ~30 MB npm. rasterio adds ~60 MB |
| Hillshade tiles, if built | ~55 MB committed (zoom 10–14) |

---

## 4. Verification — run 2026-08-23

Every package was made to do real work against real cached data before being
relied on. All six passed; two produced findings worth keeping.

| # | Check | Result |
|---|---|---|
| 1 | pyproj WGS84 ↔ UTM 17N round trip | **0.0000 mm** error |
| 2 | shapely reproduces the pure-Python point-in-polygon for Hopkins Steel Works (2 Broadway, Welland) | **`L1` Light Industrial** — matches |
| 3 | shapely area in UTM 17N vs Welland's own `GeometrySTArea`, 1,980 polygons | median **0.0000%**, p95 **0.0000%** |
| 4 | pyogrio opens a real shapefile (provincial PSEZ package) | **31 features, EPSG:26917** |
| 5 | orjson parses identically to stdlib | identical; **2.6× faster** |
| 6 | mapshaper topology vs shapely per-geometry | see TECHNOLOGY-DECISIONS D-6 |

**Check 3 is the strongest result.** Our computed areas agree with the
publisher's own precomputed figures to four decimal places across every Welland
zoning polygon. The UTM 17N decision (D-3) is not merely reasonable — it is
confirmed against an independent source.

### Two findings from the verification itself

**No Provincially Significant Employment Zone exists anywhere in Niagara
Region** — see [GLOSSARY.md](GLOSSARY.md); this is true of the *jurisdiction*,
not of the peninsula, which has ten.
Reading the PSEZ shapefile for check 4 gave the full list: 31 zones across the
Greater Golden Horseshoe — Toronto 5, Durham 3, Hamilton 3, Toronto/York 3,
Waterloo 3, Brantford 2, Halton 2, Halton/Peel 2, Toronto/Peel 2, and one each
in Guelph, **Haldimand County**, Peel, Simcoe, Toronto/York/Peel and York.
**Niagara Region has none**, under any of its twelve municipal names. All were
"Identified by the Minister on December 20, 2019".

**Stated precisely, the finding is sharper.** The wider **Niagara Peninsula**
has ten — Hamilton 3, Halton 2, Halton/Peel 2, Brantford 2, Haldimand 1. So the
Province designated provincially significant employment zones across the
peninsula and its approaches and **none inside Niagara Region**. A jurisdiction
passed over by its neighbours is a far more interesting fact than a blank map,
and it would have been lost by saying "Niagara".

Consequence for the engine: `in_psez` is `false` for every Niagara **Region**
unit by construction, and the field is informative only for Hamilton, Halton,
Haldimand and Brantford. The absence is itself a finding an atlas about Niagara's industrial
land should probably state plainly.

**mapshaper deletes small polygons unless told not to.** At `-simplify 10%` it
collapsed **27 of 60** test polygons to null geometry. `keep-shapes` prevents
it. Any simplification step must assert that the output feature count equals
the input.

---

## 5. Reproducing the verification

```bash
cd atlas
.venv/bin/python -c "from pyproj import Transformer; \
  t=Transformer.from_crs('EPSG:4326','EPSG:32617',always_xy=True); print(t.transform(-79.24,42.99))"
.venv/bin/python -c "import shapely,pyproj,pyogrio,orjson,rasterio; \
  print(shapely.__version__,pyproj.__version__,pyogrio.__version__,orjson.__version__,rasterio.__version__)"
npx mapshaper --version
```
