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
