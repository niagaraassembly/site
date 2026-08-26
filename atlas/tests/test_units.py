import sys, pathlib, json
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


def test_municipality_join_holds_between_polygon_sources_and_anchors():
    """Ruling F2: geometry_sources hardcodes its municipality strings in the
    source descriptors, while addresses derives them from the data. If the
    two forms silently disagree ('hamilton' vs 'city of hamilton'),
    build_units() would mint address-tier units for a municipality that
    already has parcels or footprints, duplicating units and inflating
    every later count.

    Consolidated fix round, item 1: this must exercise units.build_units()
    itself, not just the raw source data. Computing normalized sets
    directly from PARCEL_SOURCES/FOOTPRINT_SOURCES and load_anchors() (as
    this test formerly did) proves the *data* can be aligned, never that
    units.py actually performs the alignment - it would still pass if
    units.py regressed to comparing raw, unnormalized strings. The
    property that matters and that actually depends on units.py's join
    logic: no municipality appearing on a parcel or footprint unit may
    also appear on an address unit. That duplication is exactly what the
    join exists to prevent."""
    built = units.build_units()
    polygon_munis = {u["municipality"] for u in built
                      if u["unit_tier"] in ("parcel", "footprint")}
    address_munis = {u["municipality"] for u in built
                      if u["unit_tier"] == "address"}
    overlap = polygon_munis & address_munis
    assert not overlap, (
        f"municipalities on both a polygon-tier and an address-tier unit "
        f"(duplication the join should have prevented): {sorted(overlap)}\n"
        f"polygon-tier municipalities: {sorted(polygon_munis)}\n"
        f"address-tier municipalities: {sorted(address_munis)}"
    )


def test_index_contains_only_allowed_municipalities():
    """Consolidated fix round, item 4: the unit index scope is the twelve
    Niagara Region lower-tier municipalities plus Hamilton - an explicit
    allow-list, not whatever labels happen to appear in source data.
    Stray regional/county labels ('regional municipality of niagara',
    'county of brant', 'wellington county', 'regional municipality of
    halton') must be excluded rather than normalized into the list, because
    normalizing 'regional municipality of niagara' yields 'niagara', which
    is not a lower-tier municipality and would merely rename the bug."""
    built = units.build_units()
    munis = {u["municipality"] for u in built}
    assert munis == units.ALLOWED_MUNICIPALITIES, (
        f"unexpected municipalities in index: "
        f"{sorted(munis - units.ALLOWED_MUNICIPALITIES)}\n"
        f"allowed municipalities missing from index: "
        f"{sorted(units.ALLOWED_MUNICIPALITIES - munis)}"
    )


def test_every_source_id_exists_in_registry():
    """Provenance travels with every feature (binding constraint): source id,
    retrieval date, licence, original id. Every source.id appearing in the
    unit index must resolve to a record in atlas/sources/sources.json, so
    that downstream code can attach the full source metadata to features."""
    built = units.build_units()
    source_ids = {u["source"]["id"] for u in built}

    sources_path = pathlib.Path(__file__).resolve().parents[1] / "sources" / "sources.json"
    with open(sources_path) as fh:
        sources_registry = json.load(fh)
    registry_ids = {s["id"] for s in sources_registry}

    missing = source_ids - registry_ids
    assert not missing, (
        f"source ids in unit index but missing from sources.json: "
        f"{sorted(missing)}"
    )
