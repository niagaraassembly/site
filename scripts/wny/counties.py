#!/usr/bin/env python3
"""Build data/geo/wny-counties.json: one outline per Western New York county.

Outlines come from the U.S. Census Bureau's TIGERweb service (public domain),
generalised on the server. Each county is projected on its own (longitude
scaled by the cosine of its latitude, so shapes are not stretched), fitted to
a 0-100 box that keeps its proportions, and rounded to 0.1. The page draws
each outline in its own tile.

The counties are those of atlas/GLOSSARY.md's Western New York, minus the
border counties it leaves undecided (Oswego, Cortland, Broome). Tiles are
ordered as a two-row band: the northern half by centroid latitude first,
each row west to east.

Usage:
    python3 scripts/wny/counties.py [--out data/geo/wny-counties.json]
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path
from typing import Sequence

SITE = Path(__file__).resolve().parents[2]
SERVICE = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1/query"
COUNTIES = [
    "Niagara", "Erie", "Chautauqua", "Cattaraugus", "Allegany", "Orleans", "Genesee", "Wyoming",
    "Monroe", "Livingston", "Wayne", "Ontario", "Yates", "Seneca", "Cayuga", "Onondaga",
    "Steuben", "Schuyler", "Chemung", "Tompkins", "Tioga",
]
SIMPLIFY_DEG = 0.004   # server-side generalisation, about 300-400 m here
MIN_RING_SHARE = 0.01  # drop islands under 1% of a county's largest ring


def fetch() -> dict:
    names = ",".join(f"'{n}'" for n in COUNTIES)
    params = {
        "where": f"STATE='36' AND BASENAME IN ({names})",
        "outFields": "BASENAME,GEOID,CENTLAT,CENTLON",
        "outSR": "4326",
        "maxAllowableOffset": str(SIMPLIFY_DEG),
        "f": "geojson",
    }
    req = urllib.request.Request(f"{SERVICE}?{urllib.parse.urlencode(params)}",
                                 headers={"User-Agent": "NiagaraAssemblySite/1.0 (office@niagaraassembly.com)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def ring_area(ring: Sequence[Sequence[float]]) -> float:
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:]))) / 2


def shape(feature: dict) -> dict:
    props, geom = feature["properties"], feature["geometry"]
    polygons = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    outers = [poly[0] for poly in polygons]  # outer rings; lake holes are not needed at tile size
    lat0 = float(props["CENTLAT"])
    k = math.cos(math.radians(lat0))
    projected = [[(lon * k, -lat) for lon, lat in ring] for ring in outers]
    biggest = max(ring_area(r) for r in projected)
    projected = [r for r in projected if ring_area(r) >= biggest * MIN_RING_SHARE]
    xs = [x for r in projected for x, _ in r]
    ys = [y for r in projected for _, y in r]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    scale = 100 / max(w, h)
    rings = [[[round((x - min(xs)) * scale, 1), round((y - min(ys)) * scale, 1)] for x, y in r] for r in projected]
    return {
        "name": props["BASENAME"],
        "geoid": props["GEOID"],
        "lat": round(lat0, 4),
        "lon": round(float(props["CENTLON"]), 4),
        "width": round(w * scale, 1),
        "height": round(h * scale, 1),
        "rings": rings,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build Western New York county outlines for the MAG.")
    parser.add_argument("--out", type=Path, default=SITE / "data" / "geo" / "wny-counties.json")
    args = parser.parse_args(argv)
    data = fetch()
    counties = [shape(f) for f in data.get("features", [])]
    missing = sorted(set(COUNTIES) - {c["name"] for c in counties})
    if missing:
        print(f"error: TIGERweb returned no outline for: {', '.join(missing)}", file=sys.stderr)
        return 1
    by_lat = sorted(counties, key=lambda c: -c["lat"])
    north = sorted(by_lat[: (len(by_lat) + 1) // 2], key=lambda c: c["lon"])
    south = sorted(by_lat[(len(by_lat) + 1) // 2:], key=lambda c: c["lon"])
    out = {
        "source": "U.S. Census Bureau, TIGERweb State_County layer 1 (public domain)",
        "fetched": date.today().isoformat(),
        "simplify_degrees": SIMPLIFY_DEG,
        "rows": [[c["name"] for c in north], [c["name"] for c in south]],
        "counties": {c["name"]: c for c in counties},
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, separators=(",", ":")) + "\n", encoding="utf-8")
    points = sum(len(r) for c in counties for r in c["rings"])
    print(f"wrote {len(counties)} counties, {points} points, {args.out.stat().st_size} bytes to {args.out}")
    print("  row 1:", ", ".join(out["rows"][0]))
    print("  row 2:", ", ".join(out["rows"][1]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
