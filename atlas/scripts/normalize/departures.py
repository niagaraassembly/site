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
