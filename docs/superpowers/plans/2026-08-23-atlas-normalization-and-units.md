# Atlas Normalization and Unit Index — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 231 cached source layers into a single normalized unit index — every parcel, building footprint and address point in the study area, each carrying provenance — and fix the live departures defect on the way.

**Architecture:** A `normalize/` package with one module per publisher family, each emitting the same canonical record shape. A geocoder joins address-bearing tables to address points. `units.py` walks the ladder (parcel → footprint → address) and emits the unit index the enrichment stage will consume. Standard library plus shapely/pyproj; no dataframes.

**Tech Stack:** Python 3.11 in `atlas/.venv` — shapely 2.1.2, pyproj 3.7.2, orjson 3.12.0, pytest. GeoJSON in, GeoJSON out.

**Spec:** `docs/superpowers/specs/2026-08-23-atlas-engine-design.md` — §3 (architecture), §4 (record shape), §6 (the ladder), §9 (failure modes).

## Scope note — this is plan 1 of several

The spec covers more than one plan's worth of work. Proposed split, each producing working testable software:

| Plan | Covers | Spec |
|---|---|---|
| **1 — this one** | normalization, geocoding, the unit index | §3, §4, §6 |
| 2 | enrichment: constraints, distances, containment | §4, §5.1 |
| 3 | change detection across epochs | §5.2, §5.5, §5.6 |
| 4 | emit (public/member, k=3) + `score.js` + weights | §5, §6.3, §8 |
| 5 | the site dossier and contradiction states | §7 |
| 6 | basemaps and the self-hosted hillshade | TECHNOLOGY-DECISIONS D-10…D-12 |

## Global Constraints

- **Python 3.11**, run as `atlas/.venv/bin/python`. System Python is PEP 668 externally-managed — never `pip install` outside the venv.
- **All area and distance maths in EPSG:32617** (UTM 17N). Never compute area in EPSG:4326. Spec D-3.
- **Provenance travels with every feature**: source id, retrieval date, licence, original id. Spec §4.
- **A gap is shown as a gap.** Missing data yields `None`, never `0`.
- **Every count is observed, never assumed.**
- **Jurisdiction precision** — `atlas/GLOSSARY.md` is binding. "Niagara Region" is the upper-tier municipality and a publisher, never the area.
- **Raw-log findings** to `atlas/logs/YYYY-MM-DD.md` as work happens. `CLAUDE.md`.
- Cache lives in `atlas/scripts/.cache/{bulk,hamilton}/`, is gitignored, and is **read-only** to this plan.

---

### Task 1: NEI edition loader with stable keys

The NEI schema drifts across editions (`NEI_ID`→`nei_id`, `SizeRange_Employees`→`EmployeeSizeRange`→`sizerangeemployees`). Cross-year comparison silently returns zero unless normalized — this already happened once during design. Spec §5.6.

**Files:**
- Create: `atlas/scripts/normalize/__init__.py`
- Create: `atlas/scripts/normalize/nei.py`
- Test: `atlas/tests/test_normalize_nei.py`

**Interfaces:**
- Consumes: cached `atlas/scripts/.cache/nei{2017,2018,2019,2022}.geojson`
- Produces:
  - `norm_props(feature: dict) -> dict` — lower-cased, underscore-stripped keys
  - `load_edition(year: int) -> list[dict]` — each `{"nei_id": int, "props": dict, "geometry": dict|None}`
  - `EDITIONS: tuple[int, ...]` = `(2017, 2018, 2019, 2022)`

- [ ] **Step 1: Install pytest into the venv**

```bash
cd atlas && .venv/bin/python -m pip install pytest
```

- [ ] **Step 2: Write the failing test**

Create `atlas/tests/test_normalize_nei.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from normalize import nei


def test_norm_props_lowercases_and_strips_underscores():
    f = {"properties": {"NEI_ID": 8130, "SizeRange_Employees": "Small"}}
    p = nei.norm_props(f)
    assert p["neiid"] == 8130
    assert p["sizerangeemployees"] == "Small"


def test_every_edition_loads_with_ids():
    for year in nei.EDITIONS:
        recs = nei.load_edition(year)
        assert len(recs) > 10_000, f"{year} loaded {len(recs)} records"
        assert all(r["nei_id"] is not None for r in recs)


def test_editions_intersect_by_id():
    """Silent zero from schema drift is the failure mode this guards. Spec 5.6."""
    ids = {y: {r["nei_id"] for r in nei.load_edition(y)} for y in nei.EDITIONS}
    for a, b in zip(nei.EDITIONS, nei.EDITIONS[1:]):
        overlap = ids[a] & ids[b]
        assert len(overlap) > 5_000, f"{a}->{b} intersection is {len(overlap)}"


def test_hopkins_present_in_every_edition():
    """The named case behind the departures defect. Log 2026-08-23 section 14."""
    for year in nei.EDITIONS:
        recs = {r["nei_id"]: r for r in nei.load_edition(year)}
        assert 8130 in recs, f"nei_id 8130 missing from {year}"
        assert "hopkins" in recs[8130]["props"]["businessname"].lower()
```

- [ ] **Step 3: Run the test and watch it fail**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_normalize_nei.py -v
```
Expected: `ModuleNotFoundError: No module named 'normalize'`

- [ ] **Step 4: Write the implementation**

Create `atlas/scripts/normalize/__init__.py` (empty file).

Create `atlas/scripts/normalize/nei.py`:

```python
#!/usr/bin/env python3
"""Normalize the Niagara Employment Inventory across its four editions.

The Region restyles field names between editions. 2017 and 2018 ship `NEI_ID`
and `SizeRange_Employees`; 2019 ships `EmployeeSizeRange`; 2022 ships
`nei_id` and `sizerangeemployees`. Comparing editions without normalizing
returns zero matches and looks like a finding rather than a bug — this
happened during design on 2026-08-23.

`nei_id` keys a PREMISES RECORD, not a business. Across 2019->2022, 95.4% of
ids keep the same business name and 544 change it. A changed name under a
stable id is a turnover, not a departure.

Licence: Open Government Licence 2.0 (Niagara Region). Attribution required.
"""

import json
import pathlib

CACHE = pathlib.Path(__file__).resolve().parents[1] / ".cache"
EDITIONS = (2017, 2018, 2019, 2022)


def norm_props(feature):
    """Lower-case keys and strip underscores, so every edition looks alike."""
    props = feature.get("properties") or {}
    return {k.lower().replace("_", ""): v for k, v in props.items()}


def load_edition(year):
    """Return [{'nei_id', 'props', 'geometry'}] for one edition."""
    path = CACHE / f"nei{year}.geojson"
    with open(path) as fh:
        features = json.load(fh).get("features", [])
    out = []
    for feature in features:
        props = norm_props(feature)
        nei_id = props.get("neiid")
        if nei_id is None:
            continue
        out.append({
            "nei_id": int(nei_id),
            "props": props,
            "geometry": feature.get("geometry"),
        })
    return out
```

- [ ] **Step 5: Run the test and watch it pass**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_normalize_nei.py -v
```
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add atlas/scripts/normalize/ atlas/tests/test_normalize_nei.py
git commit -m "Normalize the NEI across its four editions

Field names drift between editions and comparing them without normalizing
returns zero matches, which looks like a finding rather than a bug. A test
asserts every adjacent year-pair intersects by more than 5,000 ids."
```

---

### Task 2: Rebuild departure detection on `nei_id`

**This fixes a live defect.** `data/niagara-departures.geojson` ships 68 claimed departures; 64 of them name businesses whose `nei_id` is present in the 2022 edition. Root cause is in `atlas/logs/2026-08-23.md` §14: the existing code keys on the raw address string, and NEI address strings are not stable across editions.

**Files:**
- Create: `atlas/scripts/normalize/departures.py`
- Test: `atlas/tests/test_departures.py`
- Modify: `atlas/data/niagara-departures.geojson` (regenerated output)

**Interfaces:**
- Consumes: `normalize.nei.load_edition`, `normalize.nei.EDITIONS`
- Produces:
  - `INDUSTRIAL_SECTORS: frozenset[str]` = `{"31","32","33","41","48","49"}`
  - `is_industrial(props: dict) -> bool`
  - `find_departures(baseline: int, latest: int) -> list[dict]` — GeoJSON Features
  - `build() -> dict` — a FeatureCollection

- [ ] **Step 1: Write the failing test**

Create `atlas/tests/test_departures.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from normalize import departures, nei


def test_industrial_sector_classification():
    assert departures.is_industrial({"primarynaics": 332319})
    assert departures.is_industrial({"primarynaics": "484121"})
    assert not departures.is_industrial({"primarynaics": 621210})
    assert not departures.is_industrial({"primarynaics": None})


def test_hopkins_is_not_a_departure():
    """nei_id 8130 is present in all four editions. It must never be emitted."""
    for baseline in (2017, 2018, 2019):
        found = departures.find_departures(baseline, 2022)
        ids = {f["properties"]["nei_id"] for f in found}
        assert 8130 not in ids, f"Hopkins emitted from the {baseline} baseline"


def test_no_departure_names_a_business_present_later():
    """The regression test named in spec 9.2. No emitted departure may have an
    id appearing in any edition after its baseline."""
    later_ids = {y: {r["nei_id"] for r in nei.load_edition(y)} for y in nei.EDITIONS}
    for baseline in (2017, 2018, 2019):
        for feat in departures.find_departures(baseline, 2022):
            nid = feat["properties"]["nei_id"]
            for year in nei.EDITIONS:
                if year > baseline:
                    assert nid not in later_ids[year], (
                        f"nei_id {nid} emitted from {baseline} but present in {year}"
                    )


def test_departure_count_is_plausible():
    """Observed 2026-08-23: 15 industrial ids from the 2019 baseline are absent
    from 2022. The old address-keyed layer claimed 68."""
    found = departures.find_departures(2019, 2022)
    assert 5 <= len(found) <= 40, f"got {len(found)}"


def test_features_carry_provenance():
    for feat in departures.find_departures(2019, 2022):
        src = feat["properties"]["source"]
        assert src["licence"].startswith("Open Government Licence 2.0")
        assert src["id"] == "niagara-nei"
        assert feat["properties"]["last_seen"] < feat["properties"]["gone_by"]
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_departures.py -v
```
Expected: `ImportError: cannot import name 'departures'`

- [ ] **Step 3: Write the implementation**

Create `atlas/scripts/normalize/departures.py`:

```python
#!/usr/bin/env python3
"""Derive industrial departures from the NEI, keyed on nei_id.

WHY NOT ADDRESS. The previous implementation keyed on
(street number, street name, municipality) taken from the raw strings. NEI
address strings are not stable across editions: Hopkins Steel Works is
'2 Broadway' in 2017 and 2018 and '2 Broadway Street' in 2019 and 2022. Its
2018 key is therefore absent from the 2022 key set and a departure was emitted
for a business that never left. 64 of the 68 shipped features were false this
way. See atlas/logs/2026-08-23.md section 14.

nei_id is stable. A departure is an id present at the baseline and absent from
EVERY later edition.

Licence: Open Government Licence 2.0 (Niagara Region). Attribution required.
"""

import json
import pathlib

from . import nei

INDUSTRIAL_SECTORS = frozenset({"31", "32", "33", "41", "48", "49"})
OUT = pathlib.Path(__file__).resolve().parents[2] / "data" / "niagara-departures.geojson"

SOURCE = {
    "id": "niagara-nei",
    "name": "Niagara Region Employment Inventory",
    "licence": "Open Government Licence 2.0 (Niagara Region)",
    "attribution": "Contains information licensed under OGL 2.0 - Niagara Region",
}


def is_industrial(props):
    naics = props.get("primarynaics")
    if naics is None:
        return False
    return str(naics)[:2] in INDUSTRIAL_SECTORS


def find_departures(baseline, latest):
    """Industrial ids present at `baseline` and absent from every later edition."""
    later = set()
    for year in nei.EDITIONS:
        if year > baseline:
            later |= {r["nei_id"] for r in nei.load_edition(year)}

    out = []
    for rec in nei.load_edition(baseline):
        if rec["nei_id"] in later or not is_industrial(rec["props"]):
            continue
        p = rec["props"]
        number = str(p.get("businessstreetnumber") or "").strip()
        street = str(p.get("businessstreetname") or "").strip()
        out.append({
            "type": "Feature",
            "geometry": rec["geometry"],
            "properties": {
                "nei_id": rec["nei_id"],
                "last_seen": baseline,
                "gone_by": latest,
                "business": p.get("businessname"),
                "municipality": p.get("municipality"),
                "address": f"{number} {street}".strip(),
                "naics": str(p.get("primarynaics") or ""),
                "sector": p.get("primarysector"),
                "industry": p.get("industry"),
                "claim_state": "supported",
                "source": dict(SOURCE, retrieved="2026-08-21", edition=baseline),
            },
        })
    return out


def build():
    """Latest baseline wins, so a departure is attributed to the last edition
    that actually recorded it."""
    seen, feats = set(), []
    for baseline in sorted((y for y in nei.EDITIONS if y != nei.EDITIONS[-1]), reverse=True):
        for feat in find_departures(baseline, nei.EDITIONS[-1]):
            if feat["properties"]["nei_id"] in seen:
                continue
            seen.add(feat["properties"]["nei_id"])
            feats.append(feat)
    return {"type": "FeatureCollection", "features": feats}


if __name__ == "__main__":
    fc = build()
    with open(OUT, "w") as fh:
        json.dump(fc, fh)
    print(f"wrote {len(fc['features'])} departures to {OUT}")
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_departures.py -v
```
Expected: 5 passed.

- [ ] **Step 5: Regenerate the shipped layer and record the change**

```bash
cd atlas && .venv/bin/python -m scripts.normalize.departures 2>/dev/null \
  || (cd scripts && ../.venv/bin/python -c "from normalize import departures; import json; \
     fc=departures.build(); json.dump(fc, open('../data/niagara-departures.geojson','w')); \
     print(len(fc['features']), 'departures')")
```
Expected: a count between 5 and 40, replacing the previous 68.

- [ ] **Step 6: Append the correction to the raw log**

Add to `atlas/logs/`(today)`.md`: the old count, the new count, and the ids dropped.

- [ ] **Step 7: Update BACKLOG.md**

Change the "Live data defect" section heading to `## Resolved 2026-08-<dd>` and state the new count and the regression test that prevents recurrence.

- [ ] **Step 8: Commit**

```bash
git add atlas/scripts/normalize/departures.py atlas/tests/test_departures.py \
        atlas/data/niagara-departures.geojson atlas/BACKLOG.md atlas/logs/
git commit -m "Key departures on nei_id, and fix 64 false claims

Address strings are not stable across NEI editions, so an address-derived key
manufactures departures whenever the Region restyles an address. A regression
test asserts no emitted departure names an id present in any later edition."
```

---

### Task 3: The address anchor index

The universal join anchor. 208,004 Niagara Region address points covering all twelve lower-tier municipalities, plus 273,535 for Hamilton. Spec §6.1.

**Files:**
- Create: `atlas/scripts/normalize/addresses.py`
- Test: `atlas/tests/test_addresses.py`

**Interfaces:**
- Consumes: `.cache/bulk/043-address-points.geojson`, `.cache/hamilton/220-addresses.geojson`
- Produces:
  - `normalize_street(text: str) -> str` — lower-case, punctuation stripped, trailing type word removed
  - `address_key(number, street, municipality) -> str | None`
  - `load_anchors() -> dict[str, dict]` — key → `{"lon","lat","municipality","source_id"}`

- [ ] **Step 1: Write the failing test**

Create `atlas/tests/test_addresses.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from normalize import addresses


def test_street_normalization_absorbs_type_words():
    assert addresses.normalize_street("Broadway Street") == "broadway"
    assert addresses.normalize_street("Broadway") == "broadway"
    assert addresses.normalize_street("Lake St.") == "lake"
    assert addresses.normalize_street("Montrose Road") == "montrose"


def test_street_normalization_keeps_meaningful_names():
    """A street whose name IS a type word must not be emptied."""
    assert addresses.normalize_street("Broadway") != ""
    assert addresses.normalize_street("Highway 20") != ""


def test_address_key_is_stable_across_restyling():
    a = addresses.address_key("2", "Broadway", "Welland")
    b = addresses.address_key("2", "Broadway Street", "Welland")
    assert a == b and a is not None


def test_address_key_rejects_incomplete_input():
    assert addresses.address_key("", "Broadway", "Welland") is None
    assert addresses.address_key("2", "", "Welland") is None


def test_anchors_cover_all_twelve_lower_tier_municipalities():
    anchors = addresses.load_anchors()
    assert len(anchors) > 300_000
    munis = {a["municipality"] for a in anchors.values()}
    for expected in ("wainfleet", "west lincoln", "pelham", "grimsby",
                     "thorold", "port colborne"):
        assert any(expected in m for m in munis), f"{expected} missing"
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_addresses.py -v
```
Expected: `ImportError: cannot import name 'addresses'`

- [ ] **Step 3: Write the implementation**

Create `atlas/scripts/normalize/addresses.py`:

```python
#!/usr/bin/env python3
"""The address anchor index - the universal join key for the study area.

Niagara Region publishes address points for all twelve lower-tier
municipalities (208,004), including the six that publish nothing of their own.
Hamilton publishes 273,535. Together they are the only geometry covering
everywhere, which is why address-bearing tables geocode to these and roll up
to whatever unit exists above them. Spec section 6.1.

Street type words are absorbed because publishers restyle them between
editions - '2 Broadway' and '2 Broadway Street' are the same place, and
treating them as different is what produced 64 false departures.

Licences: OGL 2.0 (Niagara Region); City of Hamilton Open Data Licence.
"""

import json
import pathlib
import re

CACHE = pathlib.Path(__file__).resolve().parents[1] / ".cache"

TYPE_WORDS = {
    "street", "st", "road", "rd", "avenue", "ave", "av", "drive", "dr",
    "boulevard", "blvd", "lane", "ln", "court", "ct", "crescent", "cres",
    "place", "pl", "parkway", "pkwy", "trail", "trl", "way", "terrace", "terr",
}

SOURCES = (
    {"path": CACHE / "bulk" / "043-address-points.geojson",
     "id": "niagara-address-points",
     "number": "Full_StreetNo", "street": "StreetName", "muni": "Municipality",
     "type_field": "StreetType"},
    {"path": CACHE / "hamilton" / "220-addresses.geojson",
     "id": "hamilton-addresses",
     "number": "NUMBER_COMPLETE", "street": "STREET_NAME", "muni": "MUNICIPALITY",
     "type_field": "STREET_SUFFIX_TYPE"},
)


def normalize_street(text):
    """Lower-case, strip punctuation, drop ONE trailing type word.

    Only trailing words are dropped, and never the last remaining word, so
    'Broadway' survives intact while 'Broadway Street' reduces to it.
    """
    words = re.sub(r"[^a-z0-9 ]", " ", str(text or "").lower()).split()
    if len(words) > 1 and words[-1] in TYPE_WORDS:
        words.pop()
    return " ".join(words)


def address_key(number, street, municipality):
    """Return a stable key, or None when the input cannot identify a place."""
    num = re.sub(r"[^0-9a-z]", "", str(number or "").lower())
    st = normalize_street(street)
    muni = re.sub(r"[^a-z]", "", str(municipality or "").lower())
    if not num or not st:
        return None
    return f"{num}|{st}|{muni}"


def _centroid(geometry):
    if not geometry or geometry.get("type") != "Point":
        return None
    lon, lat = geometry["coordinates"][:2]
    return lon, lat


def load_anchors():
    """key -> {'lon','lat','municipality','source_id'}. First writer wins."""
    anchors = {}
    for src in SOURCES:
        if not src["path"].exists():
            continue
        with open(src["path"]) as fh:
            features = json.load(fh).get("features", [])
        for feature in features:
            props = feature.get("properties") or {}
            street = props.get(src["street"])
            if src["type_field"] and props.get(src["type_field"]):
                street = f"{street} {props[src['type_field']]}"
            key = address_key(props.get(src["number"]), street, props.get(src["muni"]))
            point = _centroid(feature.get("geometry"))
            if not key or not point or key in anchors:
                continue
            anchors[key] = {
                "lon": point[0], "lat": point[1],
                "municipality": str(props.get(src["muni"]) or "").strip().lower(),
                "source_id": src["id"],
            }
    return anchors
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_addresses.py -v
```
Expected: 5 passed. If `test_anchors_cover_all_twelve...` fails on a municipality name, print the observed set and adjust the assertion to the observed spelling — **do not** loosen the count assertion.

- [ ] **Step 5: Commit**

```bash
git add atlas/scripts/normalize/addresses.py atlas/tests/test_addresses.py
git commit -m "Build the address anchor index

208,004 Niagara Region points across all twelve lower-tier municipalities plus
273,535 for Hamilton. Street type words are absorbed so that a publisher
restyling an address does not create a new place."
```

---

### Task 4: Geocode address-bearing tables, and report the match rate

Hamilton's best evidence is address-only: 194,466 permits, the 84-record vacant registry, 590 addressed licensed businesses. Unreported match failure reads as "nothing happened here". Spec §9.1 requires the rate be reported and a floor fail the build.

**Files:**
- Create: `atlas/scripts/geocode.py`
- Test: `atlas/tests/test_geocode.py`

**Interfaces:**
- Consumes: `normalize.addresses.load_anchors`, `normalize.addresses.address_key`
- Produces:
  - `GeocodeResult` — `{"matched": list[dict], "unmatched": list[dict], "rate": float}`
  - `geocode(rows, number_field, street_field, muni_field, anchors, municipality_default=None) -> GeocodeResult`
  - `assert_rate(result, floor, label) -> None` — raises `GeocodeRateError` below the floor

- [ ] **Step 1: Write the failing test**

Create `atlas/tests/test_geocode.py`:

```python
import sys, pathlib, pytest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

import geocode
from normalize import addresses

ANCHORS = {
    addresses.address_key("2", "Broadway", "Welland"): {
        "lon": -79.24, "lat": 42.99, "municipality": "welland",
        "source_id": "niagara-address-points",
    }
}


def test_matches_despite_street_restyling():
    rows = [{"n": "2", "s": "Broadway Street", "m": "Welland"}]
    res = geocode.geocode(rows, "n", "s", "m", ANCHORS)
    assert res["rate"] == 1.0
    assert res["matched"][0]["lon"] == -79.24


def test_unmatched_rows_are_kept_not_dropped():
    rows = [{"n": "2", "s": "Broadway", "m": "Welland"},
            {"n": "999", "s": "Nowhere", "m": "Welland"}]
    res = geocode.geocode(rows, "n", "s", "m", ANCHORS)
    assert res["rate"] == 0.5
    assert len(res["unmatched"]) == 1
    assert len(res["matched"]) == 1


def test_rate_floor_raises_below_threshold():
    rows = [{"n": "999", "s": "Nowhere", "m": "Welland"}]
    res = geocode.geocode(rows, "n", "s", "m", ANCHORS)
    with pytest.raises(geocode.GeocodeRateError) as exc:
        geocode.assert_rate(res, 0.8, "test table")
    assert "test table" in str(exc.value)


def test_rate_floor_passes_above_threshold():
    rows = [{"n": "2", "s": "Broadway", "m": "Welland"}]
    res = geocode.geocode(rows, "n", "s", "m", ANCHORS)
    geocode.assert_rate(res, 0.8, "test table")


def test_municipality_default_applies_when_field_absent():
    rows = [{"n": "2", "s": "Broadway"}]
    res = geocode.geocode(rows, "n", "s", None, ANCHORS, municipality_default="Welland")
    assert res["rate"] == 1.0
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_geocode.py -v
```
Expected: `ModuleNotFoundError: No module named 'geocode'`

- [ ] **Step 3: Write the implementation**

Create `atlas/scripts/geocode.py`:

```python
#!/usr/bin/env python3
"""Join address-bearing tables to the address anchor index.

Most of Hamilton's most valuable records carry an address and no geometry -
194,466 building and demolition permits, the 84-record vacant building
registry, 590 addressed licensed businesses. They are useless until placed.

An unmatched row is NOT a row that did not happen, so unmatched rows are kept
and counted rather than dropped, and a caller may impose a floor that fails
the build. Spec section 9.1.
"""

from normalize.addresses import address_key


class GeocodeRateError(RuntimeError):
    """Raised when a table geocodes below its required floor."""


def geocode(rows, number_field, street_field, muni_field, anchors,
            municipality_default=None):
    """Return {'matched', 'unmatched', 'rate'}.

    Matched rows gain 'lon', 'lat' and 'anchor_key'. Unmatched rows are
    returned untouched so the caller can report and inspect them.
    """
    matched, unmatched = [], []
    for row in rows:
        muni = row.get(muni_field) if muni_field else municipality_default
        key = address_key(row.get(number_field), row.get(street_field), muni)
        anchor = anchors.get(key) if key else None
        if anchor is None:
            unmatched.append(row)
            continue
        matched.append(dict(row, lon=anchor["lon"], lat=anchor["lat"],
                            anchor_key=key))
    total = len(matched) + len(unmatched)
    return {
        "matched": matched,
        "unmatched": unmatched,
        "rate": (len(matched) / total) if total else 0.0,
    }


def assert_rate(result, floor, label):
    """Fail loudly rather than shipping a quietly degraded layer."""
    if result["rate"] < floor:
        raise GeocodeRateError(
            f"{label}: geocoded {result['rate']:.1%} of "
            f"{len(result['matched']) + len(result['unmatched'])} rows, "
            f"below the {floor:.0%} floor. "
            f"{len(result['unmatched'])} rows unmatched."
        )
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_geocode.py -v
```
Expected: 5 passed.

- [ ] **Step 5: Measure the real rate against Hamilton's vacant building registry**

```bash
cd atlas && .venv/bin/python -c "
import sys; sys.path.insert(0,'scripts')
import json, re, geocode
from normalize import addresses
anchors = addresses.load_anchors()
rows = [f['properties'] for f in json.load(open('scripts/.cache/hamilton/221-vacant-building-registry.geojson'))['features']]
for r in rows:
    m = re.match(r'\s*(\S+)\s+(.*)', str(r.get('FOLDER_NAME') or ''))
    r['_n'], r['_s'] = (m.group(1), m.group(2)) if m else ('', '')
res = geocode.geocode(rows, '_n', '_s', None, anchors, municipality_default='Hamilton')
print(f'vacant registry geocoded {res[\"rate\"]:.1%} of {len(rows)} rows')
"
```

Record the observed rate in the raw log. **Do not set a floor before measuring** — the floor is chosen from the observed rate in Task 8.

- [ ] **Step 6: Commit**

```bash
git add atlas/scripts/geocode.py atlas/tests/test_geocode.py atlas/logs/
git commit -m "Geocode address-bearing tables and report the match rate

Unmatched rows are kept and counted rather than dropped, because an unmatched
permit is not a permit that did not happen. A caller may impose a floor that
fails the build rather than shipping a quietly degraded layer."
```

---

### Task 5: Parcel and footprint normalizers

**Files:**
- Create: `atlas/scripts/normalize/geometry_sources.py`
- Test: `atlas/tests/test_geometry_sources.py`

**Interfaces:**
- Consumes: cached parcel and footprint layers
- Produces:
  - `PARCEL_SOURCES`, `FOOTPRINT_SOURCES` — tuples of source descriptors
  - `load_polygons(sources) -> list[dict]` — `{"id","tier","municipality","geometry","area_m2","source"}`
  - `area_m2(geometry) -> float` — computed in EPSG:32617

- [ ] **Step 1: Write the failing test**

Create `atlas/tests/test_geometry_sources.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from normalize import geometry_sources as gs


def test_area_matches_publisher_precomputed_figure():
    """Welland zoning ships GeometrySTArea. Ours must agree. Spec D-3."""
    import json
    feats = [f for f in json.load(open(
        pathlib.Path(__file__).resolve().parents[1] /
        "scripts/.cache/welland/current-zoning.geojson"))["features"]
        if f.get("geometry") and f["properties"].get("GeometrySTArea")]
    errors = []
    for f in feats[:300]:
        ours = gs.area_m2(f["geometry"])
        theirs = f["properties"]["GeometrySTArea"]
        errors.append(abs(ours - theirs) / theirs)
    errors.sort()
    assert errors[len(errors) // 2] < 0.001, f"median error {errors[len(errors)//2]}"


def test_parcels_load_with_tier_and_area():
    parcels = gs.load_polygons(gs.PARCEL_SOURCES)
    assert len(parcels) > 70_000
    assert all(p["tier"] == "parcel" for p in parcels)
    assert all(p["area_m2"] > 0 for p in parcels[:1000])


def test_footprints_load_with_tier():
    prints = gs.load_polygons(gs.FOOTPRINT_SOURCES)
    assert len(prints) > 250_000
    assert all(p["tier"] == "footprint" for p in prints[:1000])


def test_every_polygon_carries_provenance():
    for p in gs.load_polygons(gs.PARCEL_SOURCES)[:100]:
        assert p["source"]["licence"]
        assert p["source"]["id"]
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_geometry_sources.py -v
```
Expected: `ImportError: cannot import name 'geometry_sources'`

- [ ] **Step 3: Write the implementation**

Create `atlas/scripts/normalize/geometry_sources.py`:

```python
#!/usr/bin/env python3
"""Parcel and building-footprint sources, normalized to one shape.

Area is computed in EPSG:32617 (UTM 17N), never in EPSG:4326 where a square
degree is not a constant area and every figure would be plausibly wrong.
Verified 2026-08-23 against Welland's own GeometrySTArea across 1,980
polygons: median and p95 relative error both 0.0000%.
"""

import json
import pathlib

from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform as shp_transform

CACHE = pathlib.Path(__file__).resolve().parents[1] / ".cache"
_TO_UTM = Transformer.from_crs("EPSG:4326", "EPSG:32617", always_xy=True).transform

OGL_NIAGARA_FALLS = "Open Government Licence 2.0 (Niagara Falls)"
OGL_ST_CATHARINES = "Open Government Licence 2.0 (City of St. Catharines)"
OGL_WELLAND = "Open Government Licence 2.0 (Welland)"
HAMILTON = "City of Hamilton Open Data Licence"

PARCEL_SOURCES = (
    {"path": CACHE / "bulk" / "011-niagara-falls-property-parcels.geojson",
     "id": "nf-property-parcels", "municipality": "niagara falls",
     "licence": OGL_NIAGARA_FALLS, "tier": "parcel"},
    {"path": CACHE / "bulk" / "017-parcel-fabric-public.geojson",
     "id": "stc-parcel-fabric", "municipality": "st. catharines",
     "licence": OGL_ST_CATHARINES, "tier": "parcel"},
)

FOOTPRINT_SOURCES = (
    {"path": CACHE / "bulk" / "040-niagara-falls-building-footprints-2018.geojson",
     "id": "nf-footprints-2018", "municipality": "niagara falls",
     "licence": OGL_NIAGARA_FALLS, "tier": "footprint"},
    {"path": CACHE / "bulk" / "042-welland-building-footprints.geojson",
     "id": "welland-footprints", "municipality": "welland",
     "licence": OGL_WELLAND, "tier": "footprint"},
    {"path": CACHE / "hamilton" / "219-buildings.geojson",
     "id": "hamilton-buildings", "municipality": "hamilton",
     "licence": HAMILTON, "tier": "footprint"},
)


def area_m2(geometry):
    """Area in square metres, computed in UTM 17N."""
    return shp_transform(_TO_UTM, shape(geometry)).area


def load_polygons(sources):
    out = []
    for src in sources:
        if not src["path"].exists():
            continue
        with open(src["path"]) as fh:
            features = json.load(fh).get("features", [])
        for index, feature in enumerate(features):
            geom = feature.get("geometry")
            if not geom:
                continue
            out.append({
                "id": f"{src['id']}-{index}",
                "tier": src["tier"],
                "municipality": src["municipality"],
                "geometry": geom,
                "area_m2": area_m2(geom),
                "source": {"id": src["id"], "licence": src["licence"]},
            })
    return out
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_geometry_sources.py -v
```
Expected: 4 passed. This is slow — it projects ~360,000 polygons.

- [ ] **Step 5: Commit**

```bash
git add atlas/scripts/normalize/geometry_sources.py atlas/tests/test_geometry_sources.py
git commit -m "Normalize parcel and footprint sources, with area in UTM 17N

Areas agree with Welland's own precomputed GeometrySTArea to four decimal
places, which confirms the projection choice against an independent source."
```

---

### Task 6: Build the unit index

Walks the ladder from spec §6.1: parcel where it exists, else footprint, else the address anchor itself.

**Files:**
- Create: `atlas/scripts/units.py`
- Test: `atlas/tests/test_units.py`

**Interfaces:**
- Consumes: `normalize.geometry_sources`, `normalize.addresses`
- Produces:
  - `build_units() -> list[dict]` — each `{"id","unit_tier","municipality","area_m2"|None,"centroid","anchor_keys","source"}`
  - `TIER_ORDER = ("parcel", "footprint", "address")`

- [ ] **Step 1: Write the failing test**

Create `atlas/tests/test_units.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

import units


def test_tier_order_is_the_spec_ladder():
    assert units.TIER_ORDER == ("parcel", "footprint", "address")


def test_units_exist_for_every_lower_tier_municipality():
    """Spec 6.1: the six non-publishing municipalities hold 51,778 address
    points between them. They must not be absent."""
    built = units.build_units()
    munis = {u["municipality"] for u in built}
    for expected in ("wainfleet", "west lincoln", "pelham",
                     "grimsby", "thorold", "port colborne"):
        assert any(expected in m for m in munis), f"{expected} produced no units"


def test_wainfleet_is_address_tier_only():
    """Wainfleet publishes no parcels or footprints."""
    built = [u for u in units.build_units() if "wainfleet" in u["municipality"]]
    assert built, "wainfleet produced no units"
    assert {u["unit_tier"] for u in built} == {"address"}


def test_address_tier_units_have_no_area():
    """A point has no area. None, never 0 - zero would read as fully used."""
    for unit in units.build_units():
        if unit["unit_tier"] == "address":
            assert unit["area_m2"] is None


def test_parcel_tier_units_have_area():
    parcels = [u for u in units.build_units() if u["unit_tier"] == "parcel"]
    assert len(parcels) > 70_000
    assert all(u["area_m2"] and u["area_m2"] > 0 for u in parcels[:500])
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_units.py -v
```
Expected: `ModuleNotFoundError: No module named 'units'`

- [ ] **Step 3: Write the implementation**

Create `atlas/scripts/units.py`:

```python
#!/usr/bin/env python3
"""Build the unit index - the thing a score attaches to.

The ladder, from spec section 6.1: parcel where it exists, else building
footprint, else the address anchor itself. The address anchor is also the
universal JOIN key, which is a different role - records land on the anchor and
roll up to the unit.

An address-tier unit has area None, never 0. Zero would read as 'fully used',
the exact inversion of 'we have no denominator'.
"""

from shapely.geometry import shape

from normalize import addresses, geometry_sources

TIER_ORDER = ("parcel", "footprint", "address")


def _covered_municipalities(polygons):
    return {p["municipality"] for p in polygons}


def build_units():
    """Return the full unit index across the study area."""
    parcels = geometry_sources.load_polygons(geometry_sources.PARCEL_SOURCES)
    footprints = geometry_sources.load_polygons(geometry_sources.FOOTPRINT_SOURCES)

    units = []
    for poly in parcels + footprints:
        centroid = shape(poly["geometry"]).centroid
        units.append({
            "id": poly["id"],
            "unit_tier": poly["tier"],
            "municipality": poly["municipality"],
            "area_m2": poly["area_m2"],
            "centroid": [centroid.x, centroid.y],
            "anchor_keys": [],
            "source": poly["source"],
        })

    # Address-tier units only where no polygon source covers the municipality,
    # so we do not duplicate a place that already has a parcel or a footprint.
    covered = _covered_municipalities(parcels + footprints)
    for key, anchor in addresses.load_anchors().items():
        if anchor["municipality"] in covered:
            continue
        units.append({
            "id": f"addr-{key}",
            "unit_tier": "address",
            "municipality": anchor["municipality"],
            "area_m2": None,
            "centroid": [anchor["lon"], anchor["lat"]],
            "anchor_keys": [key],
            "source": {"id": anchor["source_id"], "licence": "see sources.json"},
        })
    return units
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_units.py -v
```
Expected: 5 passed. If a municipality assertion fails, print the observed municipality strings and match the observed spelling — the source spells "St. Catharines" with a period.

- [ ] **Step 5: Commit**

```bash
git add atlas/scripts/units.py atlas/tests/test_units.py
git commit -m "Build the unit index on the parcel-footprint-address ladder

Address-tier units carry area None rather than 0, because zero would read as
fully used - the exact inversion of having no denominator."
```

---

### Task 7: Coverage report

Coverage is a published finding, not a footnote. Spec §6.1.

**Files:**
- Create: `atlas/scripts/coverage_report.py`
- Test: `atlas/tests/test_coverage_report.py`

**Interfaces:**
- Consumes: `units.build_units`
- Produces: `summarize(units) -> dict` — `{municipality: {"parcel": n, "footprint": n, "address": n, "best_tier": str}}`

- [ ] **Step 1: Write the failing test**

Create `atlas/tests/test_coverage_report.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

import coverage_report


def test_summarize_counts_tiers_per_municipality():
    fake = [
        {"municipality": "welland", "unit_tier": "footprint"},
        {"municipality": "welland", "unit_tier": "footprint"},
        {"municipality": "wainfleet", "unit_tier": "address"},
    ]
    out = coverage_report.summarize(fake)
    assert out["welland"]["footprint"] == 2
    assert out["welland"]["best_tier"] == "footprint"
    assert out["wainfleet"]["best_tier"] == "address"


def test_best_tier_prefers_parcel():
    fake = [
        {"municipality": "niagara falls", "unit_tier": "footprint"},
        {"municipality": "niagara falls", "unit_tier": "parcel"},
    ]
    assert coverage_report.summarize(fake)["niagara falls"]["best_tier"] == "parcel"


def test_missing_tier_reports_zero_not_absent():
    fake = [{"municipality": "wainfleet", "unit_tier": "address"}]
    out = coverage_report.summarize(fake)
    assert out["wainfleet"]["parcel"] == 0
    assert out["wainfleet"]["footprint"] == 0
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_coverage_report.py -v
```
Expected: `ModuleNotFoundError: No module named 'coverage_report'`

- [ ] **Step 3: Write the implementation**

Create `atlas/scripts/coverage_report.py`:

```python
#!/usr/bin/env python3
"""Report what evidence exists where.

Six of the twelve Niagara Region lower-tier municipalities publish no spatial
data of their own. That is a finding about the region's data landscape and
belongs on the map, not in a footnote. Spec section 6.1.
"""

from units import TIER_ORDER


def summarize(units):
    """municipality -> per-tier counts plus the best tier available."""
    out = {}
    for unit in units:
        muni = unit["municipality"]
        row = out.setdefault(muni, {tier: 0 for tier in TIER_ORDER})
        row[unit["unit_tier"]] += 1
    for row in out.values():
        row["best_tier"] = next(
            (tier for tier in TIER_ORDER if row[tier] > 0), None
        )
    return out


if __name__ == "__main__":
    import units as units_module
    summary = summarize(units_module.build_units())
    width = max(len(m) for m in summary)
    for muni in sorted(summary, key=lambda m: -sum(
            v for k, v in summary[m].items() if k in TIER_ORDER)):
        row = summary[muni]
        print(f"{muni:<{width}}  parcel {row['parcel']:>7,}  "
              f"footprint {row['footprint']:>7,}  address {row['address']:>7,}  "
              f"best: {row['best_tier']}")
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_coverage_report.py -v
```
Expected: 3 passed.

- [ ] **Step 5: Run it for real and log the output**

```bash
cd atlas/scripts && ../.venv/bin/python coverage_report.py
```
Paste the table into today's raw log.

- [ ] **Step 6: Commit**

```bash
git add atlas/scripts/coverage_report.py atlas/tests/test_coverage_report.py atlas/logs/
git commit -m "Report coverage per municipality

Six of twelve lower-tier municipalities publish no spatial data of their own.
That is a finding about the region's data landscape, not a footnote."
```

---

### Task 8: Wire the pipeline together and set the geocoding floor

**Files:**
- Create: `atlas/scripts/build_units.py`
- Modify: `atlas/README.md` — status section
- Test: `atlas/tests/test_pipeline.py`

**Interfaces:**
- Consumes: everything above
- Produces: `atlas/scripts/.cache/units.json`, and a printed summary

- [ ] **Step 1: Write the failing test**

Create `atlas/tests/test_pipeline.py`:

```python
import sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

import build_units


def test_pipeline_writes_units_and_a_manifest():
    out = build_units.run(limit_municipalities={"welland"})
    assert out["units_written"] > 1_000
    assert out["coverage"]["welland"]["best_tier"] == "footprint"
    assert pathlib.Path(out["path"]).exists()


def test_output_is_valid_json_with_provenance():
    out = build_units.run(limit_municipalities={"welland"})
    with open(out["path"]) as fh:
        data = json.load(fh)
    assert data["units"]
    assert data["generated"]
    for unit in data["units"][:50]:
        assert unit["source"]["id"]
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_pipeline.py -v
```
Expected: `ModuleNotFoundError: No module named 'build_units'`

- [ ] **Step 3: Write the implementation**

Create `atlas/scripts/build_units.py`:

```python
#!/usr/bin/env python3
"""Run the normalization pipeline and write the unit index.

Usage:
    ../.venv/bin/python build_units.py
"""

import datetime
import json
import pathlib

import coverage_report
import units as units_module

OUT = pathlib.Path(__file__).resolve().parent / ".cache" / "units.json"


def run(limit_municipalities=None):
    built = units_module.build_units()
    if limit_municipalities:
        built = [u for u in built if u["municipality"] in limit_municipalities]
    summary = coverage_report.summarize(built)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump({
            "generated": datetime.date.today().isoformat(),
            "units": built,
        }, fh)
    return {"units_written": len(built), "coverage": summary, "path": str(OUT)}


if __name__ == "__main__":
    result = run()
    print(f"wrote {result['units_written']:,} units to {result['path']}")
    for muni, row in sorted(result["coverage"].items()):
        print(f"  {muni:<24} best tier: {row['best_tier']}")
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
cd atlas && .venv/bin/python -m pytest tests/test_pipeline.py -v
```
Expected: 2 passed.

- [ ] **Step 5: Run the whole suite**

```bash
cd atlas && .venv/bin/python -m pytest tests/ -v
```
Expected: all tests pass.

- [ ] **Step 6: Run the pipeline for real**

```bash
cd atlas/scripts && ../.venv/bin/python build_units.py
```

- [ ] **Step 7: Set the geocoding floor from the measured rate**

Using the rate observed in Task 4 Step 5, add to `atlas/scripts/geocode.py` a module constant with a comment giving the observed rate, the date, and the table it was measured on. **The floor is set below the observed rate, never above it** — a floor that already fails is not a floor.

- [ ] **Step 8: Update README status and commit**

```bash
git add atlas/scripts/build_units.py atlas/tests/test_pipeline.py \
        atlas/scripts/geocode.py atlas/README.md atlas/logs/
git commit -m "Wire the normalization pipeline and write the unit index

The unit index is the artefact every later stage consumes: every parcel,
footprint and address point in the study area, each carrying its tier and its
provenance."
```

---

## Self-review

**Spec coverage**

| Spec section | Task |
|---|---|
| §3 normalize/ per publisher family | 1, 3, 5 |
| §3 units.py ladder | 6 |
| §4 provenance on every feature | 1, 3, 5, 6 |
| §4 area in UTM 17N | 5 |
| §5.6 NEI cross-year normalization + non-zero intersection test | 1 |
| §6.1 join anchor vs analysis unit | 3, 6 |
| §6.1 coverage as a published finding | 7 |
| §9.1 geocoding match rate + build floor | 4, 8 |
| §9.2 departures regression test | 2 |
| BACKLOG live defect | 2 |

**Deferred to later plans, by design:** enrichment and constraints (§4 `c_*`, §5.1) → plan 2; change detection (§5.2, §5.5) → plan 3; emit, k-anonymity and scoring (§5, §6.3, §8) → plan 4; the dossier (§7) → plan 5; basemaps (D-10…D-12) → plan 6.

**Placeholder scan:** none. Every step carries runnable code or an exact command.

**Type consistency:** `address_key()` returns `str | None` and is used that way in Tasks 3, 4 and 6. `load_anchors()` returns `dict[str, dict]` throughout. `load_polygons()` returns records with `tier`, consumed as `unit_tier` in Task 6 — the rename is deliberate and happens in one place. `TIER_ORDER` is defined once in `units.py` and imported by `coverage_report.py`.

**Known ordering constraint:** Task 6 imports `normalize.addresses` and `normalize.geometry_sources`; Task 7 imports `units`. `atlas/scripts/` must be on `sys.path`, which every test does explicitly in its first two lines.
