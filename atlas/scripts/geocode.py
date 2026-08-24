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


# Observed geocoding rates, measured against the real cached tables.
# A floor is set BELOW its observed rate — a floor above it would already fail.
# Measured 2026-08-23 against scripts/.cache/hamilton/221-vacant-building-registry.geojson
# (84 rows): 86.9% (73/84). The 11 unmatched were diagnosed as highway/concession
# naming ("HWY 8" vs "Highway No. 8"), two rows whose FOLDER_NAME omits a direction
# the address point carries, one fractional civic number, and two streets absent
# from the address points entirely.
GEOCODE_FLOORS = {
    "hamilton-vacant-registry": 0.80,
}
# Hamilton's building and demolition permits (194,466 rows) and its licensed-business
# registers are separate source schemas and have NOT been measured. They get their own
# floors when they are ingested. Do not apply this floor to them — a floor borrowed
# from an unrelated table is a guess wearing a number.


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
