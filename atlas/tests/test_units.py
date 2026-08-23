import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

import units
from normalize.addresses import load_anchors, normalize_municipality
from normalize.geometry_sources import FOOTPRINT_SOURCES, PARCEL_SOURCES


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


def test_municipality_join_holds_between_polygon_sources_and_anchors():
    """Ruling F2: geometry_sources hardcodes its municipality strings in the
    source descriptors, while addresses derives them from the data. If the
    two forms silently disagree ('hamilton' vs 'city of hamilton'),
    build_units() would mint address-tier units for a municipality that
    already has parcels or footprints, duplicating units and inflating
    every later count. This asserts the join actually holds: every
    municipality named in PARCEL_SOURCES and FOOTPRINT_SOURCES matches at
    least one anchor municipality, once both sides are normalized the same
    way. On failure it prints both sets so a future mismatch is
    diagnosable rather than mysterious."""
    source_munis = {normalize_municipality(s["municipality"])
                     for s in PARCEL_SOURCES + FOOTPRINT_SOURCES}
    anchor_munis = {normalize_municipality(a["municipality"])
                     for a in load_anchors().values()}
    missing = source_munis - anchor_munis
    assert not missing, (
        f"source municipalities with no matching anchor municipality: "
        f"{sorted(missing)}\n"
        f"source municipalities (normalized): {sorted(source_munis)}\n"
        f"anchor municipalities (normalized): {sorted(anchor_munis)}"
    )
