#!/usr/bin/env python3
"""Build data/geo/wny-locator.json: New York State's outline with the WNY counties.

A small locator map for the MAG title line: the state outline, and the
region's counties (the same list as scripts/wny/counties.py) in the same
projection so they sit in place inside it. Outlines come from the U.S.
Census Bureau's TIGERweb service (public domain), generalised on the server,
projected with longitude scaled by the cosine of the state's mid latitude,
and fitted to a 0-100 box that keeps the state's proportions.

Usage:
    python3 scripts/wny/locator.py [--out data/geo/wny-locator.json]
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

SITE = Path(__file__).resolve().parents[2]
BASE = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer"
SIMPLIFY_DEG = 0.02    # coarse: the map is drawn about 60px tall
MIN_RING_SHARE = 0.002  # keep Long Island and large islands, drop specks
UA = {"User-Agent": "NiagaraAssemblySite/1.0 (office@niagaraassembly.com)"}


def query(layer: int, where: str) -> list[dict]:
    params = {"where": where, "outFields": "BASENAME", "returnGeometry": "true", "outSR": "4326",
              "maxAllowableOffset": str(SIMPLIFY_DEG), "f": "json"}
    req = urllib.request.Request(f"{BASE}/{layer}/query", data=urllib.parse.urlencode(params).encode(), headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.load(r)
    if "error" in data:
        raise RuntimeError(data["error"])
    return data.get("features", [])


def area(ring: list) -> float:
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:]))) / 2


def county_names() -> list[str]:
    spec = importlib.util.spec_from_file_location("wny_counties", SITE / "scripts" / "wny" / "counties.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.COUNTIES


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the New York locator with WNY counties.")
    parser.add_argument("--out", type=Path, default=SITE / "data" / "geo" / "wny-locator.json")
    args = parser.parse_args(argv)
    state = [r for f in query(0, "STATE='36'") for r in f["geometry"]["rings"]]
    names = county_names()
    quoted = ",".join(f"'{n}'" for n in names)
    counties = query(1, f"STATE='36' AND BASENAME IN ({quoted})")
    found = {f["attributes"]["BASENAME"] for f in counties}
    if found != set(names):
        print(f"error: missing counties {sorted(set(names) - found)}", file=sys.stderr)
        return 1
    biggest = max(area(r) for r in state)
    state = [r for r in state if area(r) >= biggest * MIN_RING_SHARE]
    lats = [y for r in state for _, y in r]
    k = math.cos(math.radians((min(lats) + max(lats)) / 2))
    xs = [x * k for r in state for x, _ in r]
    ys = [-y for y in lats]
    x0, y0 = min(xs), min(ys)
    scale = 100 / max(max(xs) - x0, max(ys) - y0)
    fit = lambda ring: [[round((x * k - x0) * scale, 2), round((-y - y0) * scale, 2)] for x, y in ring]
    out = {
        "source": "U.S. Census Bureau, TIGERweb State_County layers 0 and 1 (public domain)",
        "fetched": date.today().isoformat(),
        "width": round((max(xs) - x0) * scale, 2),
        "height": round((max(ys) - y0) * scale, 2),
        "state": [fit(r) for r in state],
        "region": [fit(r) for f in counties for r in f["geometry"]["rings"]],
    }
    args.out.write_text(json.dumps(out, separators=(",", ":")) + "\n", encoding="utf-8")
    points = sum(len(r) for r in out["state"]) + sum(len(r) for r in out["region"])
    print(f"wrote state ({len(out['state'])} rings) and {len(counties)} counties, {points} points, "
          f"{args.out.stat().st_size} bytes, box {out['width']} x {out['height']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
