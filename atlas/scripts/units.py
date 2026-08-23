#!/usr/bin/env python3
"""Build the unit index - the thing a score attaches to.

The ladder, from spec section 6.1: parcel where it exists, else building
footprint, else the address anchor itself. The address anchor is also the
universal JOIN key, which is a different role - records land on the anchor and
roll up to the unit.

An address-tier unit has area None, never 0. Zero would read as 'fully used',
the exact inversion of 'we have no denominator'.

Ruling F2 (2026-08-23): whether a municipality gets address-tier units
depends on comparing an anchor's municipality against the municipalities
covered by polygon sources. Those two strings come from different places -
geometry_sources.py hardcodes them in its source descriptors ('hamilton'),
while addresses.py derives them from the data, which for Hamilton's own
address source is 'city of hamilton'. A silent mismatch there would
duplicate units: an address-tier unit minted in a municipality that already
has parcels. Both sides of the comparison go through
normalize.addresses.normalize_municipality before being compared, never
compared as raw strings.

Ruling F4 (2026-08-23): load_polygons() projects every polygon to UTM 17N at
load - roughly 360,000 shapely transforms - and build_units() is called
repeatedly across the test suite (three tests here, two in Task 8, Task 7's
__main__). build_units() memoizes its result at module level so repeated
calls in one process are free. No `limit` parameter is offered: the count
assertions this index is checked against need the full load, not a sample.
"""

from shapely.geometry import shape

from normalize import addresses, geometry_sources
from normalize.addresses import normalize_municipality

TIER_ORDER = ("parcel", "footprint", "address")

_memo = None


def _covered_municipalities(polygons):
    """Normalized municipality strings covered by at least one polygon."""
    return {normalize_municipality(p["municipality"]) for p in polygons}


def build_units():
    """Return the full unit index across the study area.

    Memoized (Ruling F4): the first call does the full parcel/footprint
    load and UTM projection; every later call in the same process returns
    the same list without redoing that work.
    """
    global _memo
    if _memo is not None:
        return _memo

    parcels = geometry_sources.load_polygons(geometry_sources.PARCEL_SOURCES)
    footprints = geometry_sources.load_polygons(geometry_sources.FOOTPRINT_SOURCES)

    built = []
    for poly in parcels + footprints:
        centroid = shape(poly["geometry"]).centroid
        built.append({
            "id": poly["id"],
            "unit_tier": poly["tier"],
            "municipality": poly["municipality"],
            "area_m2": poly["area_m2"],
            "centroid": [centroid.x, centroid.y],
            "anchor_keys": [],
            "source": poly["source"],
        })

    # Address-tier units only where no polygon source covers the
    # municipality, so we do not duplicate a place that already has a
    # parcel or a footprint. Both sides normalized (Ruling F2) so
    # 'city of hamilton' (anchor) and 'hamilton' (polygon source) are
    # recognized as the same place.
    covered = _covered_municipalities(parcels + footprints)
    for key, anchor in addresses.load_anchors().items():
        if normalize_municipality(anchor["municipality"]) in covered:
            continue
        built.append({
            "id": f"addr-{key}",
            "unit_tier": "address",
            "municipality": anchor["municipality"],
            "area_m2": None,
            "centroid": [anchor["lon"], anchor["lat"]],
            "anchor_keys": [key],
            "source": {"id": anchor["source_id"], "licence": "see sources.json"},
        })

    _memo = built
    return built
