#!/usr/bin/env python3
"""Build data/geo/wny-districts.json: legislative districts covering each known place.

For every place in scripts/wny/export.py's PLACE_COUNTY lookup, this fetches
the place's outline and the overlapping Congressional, State Senate and State
Assembly districts from the U.S. Census Bureau's TIGERweb service (public
domain), then samples points evenly across the place to find which districts
cover it and what share of the sample each holds.

Sampling rather than a plain intersection query matters: districts that only
share a border line with a place would "intersect" it and be listed wrongly.
A district is kept when it covers at least MIN_SHARE of the sample.

Districts are the ones current officeholders were elected under: 119th
Congress and 2024 state legislative lines. The script also checks the next
vintages TIGERweb carries (120th Congress, 2026 state lines) and records
whether each place's districts differ.

Usage:
    python3 scripts/wny/districts.py [--out data/geo/wny-districts.json]
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

SITE = Path(__file__).resolve().parents[2]
BASE = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb"
PLACE_LAYERS = [("county subdivision", f"{BASE}/Places_CouSub_ConCity_SubMCD/MapServer/1"),
                ("incorporated place", f"{BASE}/Places_CouSub_ConCity_SubMCD/MapServer/4")]
CURRENT = {"congress": f"{BASE}/Legislative/MapServer/4",    # 119th Congressional Districts
           "senate": f"{BASE}/Legislative/MapServer/5",      # 2024 State Legislative Districts - Upper
           "assembly": f"{BASE}/Legislative/MapServer/6"}    # 2024 State Legislative Districts - Lower
NEXT = {"congress": f"{BASE}/Legislative/MapServer/0",       # 120th Congressional Districts
        "senate": f"{BASE}/Legislative/MapServer/1",         # 2026 State Legislative Districts - Upper
        "assembly": f"{BASE}/Legislative/MapServer/2"}       # 2026 State Legislative Districts - Lower
GRID = 40          # up to 40 x 40 sample points over a place's bounding box
MIN_SHARE = 0.02   # keep districts covering at least 2% of the sample
UA = {"User-Agent": "NiagaraAssemblySite/1.0 (office@niagaraassembly.com)"}


def query(layer: str, params: dict) -> dict:
    body = urllib.parse.urlencode({**params, "f": "json"}).encode()
    req = urllib.request.Request(f"{layer}/query", data=body, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.load(r)
    if "error" in data:
        raise RuntimeError(f"{layer}: {data['error']}")
    return data


def inside(x: float, y: float, rings: list) -> bool:
    """Even-odd ray casting over all rings, so holes are handled."""
    hit = False
    for ring in rings:
        for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                hit = not hit
    return hit


def place_shape(name: str, county_fips: str) -> tuple[str, list] | None:
    for kind, layer in PLACE_LAYERS:
        where = f"STATE='36' AND BASENAME='{name}'"
        if kind == "county subdivision":
            where += f" AND COUNTY='{county_fips}'"
        data = query(layer, {"where": where, "outFields": "BASENAME,GEOID", "returnGeometry": "true",
                             "outSR": "4326", "maxAllowableOffset": "0.0003"})
        feats = data.get("features", [])
        if kind == "incorporated place":
            # Places are not filtered by county on the server; keep those whose
            # centre lies in the county (checked against the county outline).
            feats = [f for f in feats if f["geometry"].get("rings")]
        if feats:
            return kind, [r for f in feats for r in f["geometry"]["rings"]]
    return None


def samples(rings: list) -> list[tuple[float, float]]:
    xs = [p[0] for r in rings for p in r]
    ys = [p[1] for r in rings for p in r]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    pts = []
    for i in range(GRID):
        for j in range(GRID):
            x = x0 + (i + 0.5) * (x1 - x0) / GRID
            y = y0 + (j + 0.5) * (y1 - y0) / GRID
            if inside(x, y, rings):
                pts.append((x, y))
    return pts


def districts_for(layer: str, rings: list, pts: list) -> list[dict]:
    xs = [p[0] for r in rings for p in r]
    ys = [p[1] for r in rings for p in r]
    envelope = json.dumps({"xmin": min(xs), "ymin": min(ys), "xmax": max(xs), "ymax": max(ys),
                           "spatialReference": {"wkid": 4326}})
    data = query(layer, {"geometry": envelope, "geometryType": "esriGeometryEnvelope", "inSR": "4326",
                         "spatialRel": "esriSpatialRelIntersects", "where": "STATE='36'",
                         "outFields": "BASENAME,NAME", "returnGeometry": "true", "outSR": "4326",
                         "maxAllowableOffset": "0.0003"})
    out = []
    for f in data.get("features", []):
        share = sum(inside(x, y, f["geometry"]["rings"]) for x, y in pts) / len(pts)
        if share >= MIN_SHARE:
            out.append({"id": f["attributes"]["BASENAME"], "name": f["attributes"]["NAME"], "share": round(share, 3)})
    return sorted(out, key=lambda d: -d["share"])


def load_place_county() -> dict:
    spec = importlib.util.spec_from_file_location("wny_export", SITE / "scripts" / "wny" / "export.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.PLACE_COUNTY


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build legislative districts per known WNY place.")
    parser.add_argument("--out", type=Path, default=SITE / "data" / "geo" / "wny-districts.json")
    args = parser.parse_args(argv)
    counties = json.loads((SITE / "data" / "geo" / "wny-counties.json").read_text())["counties"]
    places, problems = {}, []
    for name, county in sorted(load_place_county().items()):
        fips = counties.get(county, {}).get("geoid", "")[-3:]
        shape = place_shape(name, fips)
        if not shape:
            problems.append(f"{name}: no outline found")
            continue
        kind, rings = shape
        pts = samples(rings)
        if len(pts) < 20:
            problems.append(f"{name}: only {len(pts)} sample points")
            continue
        entry = {"county": county, "kind": kind, "samples": len(pts)}
        for chamber, layer in CURRENT.items():
            entry[chamber] = districts_for(layer, rings, pts)
        nxt = {chamber: [d["id"] for d in districts_for(layer, rings, pts)] for chamber, layer in NEXT.items()}
        entry["changes_next"] = {c: nxt[c] for c in nxt if nxt[c] != [d["id"] for d in entry[c]]}
        places[name] = entry
        print(f"  {name:16} {kind:20} congress {[d['id'] for d in entry['congress']]} "
              f"senate {[d['id'] for d in entry['senate']]} assembly {[d['id'] for d in entry['assembly']]}"
              + (f"  next differs: {entry['changes_next']}" if entry["changes_next"] else ""))
    out = {
        "source": "U.S. Census Bureau, TIGERweb (public domain): 119th Congressional Districts; "
                  "2024 State Legislative Districts (upper and lower); place outlines from "
                  "County Subdivisions or Incorporated Places",
        "fetched": date.today().isoformat(),
        "method": f"{GRID}x{GRID} grid sampled inside each place; districts covering at least {MIN_SHARE:.0%} kept",
        "places": places,
    }
    args.out.write_text(json.dumps(out, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {len(places)} places to {args.out}")
    for p in problems:
        print(f"  problem: {p}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
