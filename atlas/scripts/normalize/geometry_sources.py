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
