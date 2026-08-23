# Atlas — environment, packages and dependencies

What the Atlas is built and run with, what each package is for, and what role
it plays here specifically. Amend when anything is added or removed.

**Status: proposed, not yet installed.** Nothing in §2 exists on this machine
yet. `scripts/fetch_candidates.py`, `update_ledger.py` and `inspect_cache.py`
run on the standard library alone and will continue to.

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

## 2. Proposed packages

### Python — into `atlas/.venv`

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

### Node — global npm

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
| Transitive additions | certifi, packaging (small) |
| Node packages | mapshaper |
| Estimated disk | 150–200 MB in `atlas/.venv`, plus ~30 MB npm |

---

## 4. Verification after install

Nothing is trusted until it does real work against real cached data:

1. `pyproj` transforms a known Welland coordinate WGS84 → EPSG:32617 and back
   within tolerance.
2. `shapely` reproduces the pure-Python point-in-polygon result already
   obtained for Hopkins Steel Works (2 Broadway, Welland → zoning `L1`).
3. `shapely` computes a parcel area in UTM 17N that matches the publisher's
   own `AREA_SQM` / `GeometrySTArea` field within a small tolerance — several
   sources ship precomputed area, which makes this checkable rather than
   assumed.
4. `pyogrio` opens one of the SHP-only sources.
5. `orjson` round-trips a cached layer identically to stdlib `json`.
6. `mapshaper --version` runs, and simplifying two adjacent zoning polygons
   leaves no gap between them.
