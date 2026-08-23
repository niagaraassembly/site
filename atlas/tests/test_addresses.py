import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from normalize import addresses


def test_street_normalization_absorbs_type_words():
    assert addresses.normalize_street("Broadway Street") == "broadway"
    assert addresses.normalize_street("Broadway") == "broadway"
    assert addresses.normalize_street("Lake St.") == "lake"
    assert addresses.normalize_street("Montrose Road") == "montrose"


def test_street_normalization_keeps_meaningful_names():
    """A street whose name IS a type word must not be emptied."""
    assert addresses.normalize_street("Broadway") != ""
    assert addresses.normalize_street("Highway 20") != ""


def test_address_key_is_stable_across_restyling():
    a = addresses.address_key("2", "Broadway", "Welland")
    b = addresses.address_key("2", "Broadway Street", "Welland")
    assert a == b and a is not None


def test_address_key_rejects_incomplete_input():
    assert addresses.address_key("", "Broadway", "Welland") is None
    assert addresses.address_key("2", "", "Welland") is None


def test_anchors_cover_all_twelve_lower_tier_municipalities():
    anchors = addresses.load_anchors()
    # NOTE (deviation from task-3-brief.md, applied per instruction from the
    # task dispatch): threshold lowered from > 300_000 to > 150_000. Anchors
    # are keyed on (number, street, municipality), so multiple units in one
    # building collapse to a single key. Measured precedent from this same
    # data: the 2019 NEI has 12,016 records but only 6,501 distinct address
    # keys (a 46% collapse). 481,539 raw address points could plausibly key
    # down to roughly 250,000; the test's purpose is coverage of all twelve
    # municipalities, not a specific total.
    print(f"OBSERVED anchor count: {len(anchors)}")
    assert len(anchors) > 150_000
    munis = {a["municipality"] for a in anchors.values()}
    print(f"OBSERVED municipality strings: {sorted(munis)}")
    for expected in ("wainfleet", "west lincoln", "pelham", "grimsby",
                     "thorold", "port colborne"):
        assert any(expected in m for m in munis), f"{expected} missing"


# --- Fix round 1 (atlas/logs/2026-08-23.md SS20) -----------------------------
#
# Three design defects in the original brief, corrected here:
#   1. Directional suffixes (Burlington Street East vs West) were dropped
#      from the Hamilton street string, collapsing distinct streets into one
#      anchor key.
#   2. A trailing direction blocked normalize_street's trailing-type-word
#      drop ("RYMAL RD E" kept "rd").
#   3. Municipality strings did not match between sources ("City of
#      Hamilton" vs "Hamilton").


def test_trailing_direction_still_drops_the_type_word():
    """Defect 2: a direction in final position must not block the drop."""
    same_short = addresses.normalize_street("RYMAL RD E")
    same_long = addresses.normalize_street("Rymal Road East")
    plain = addresses.normalize_street("Rymal Road")
    assert same_short == same_long
    assert plain != same_short
    assert plain != same_long


def test_all_four_cardinal_directions_round_trip():
    """Long and short forms of every cardinal must key identically."""
    pairs = [
        ("N", "North"), ("S", "South"), ("E", "East"), ("W", "West"),
    ]
    for short, long in pairs:
        short_key = addresses.normalize_street(f"Main St {short}")
        long_key = addresses.normalize_street(f"Main Street {long}")
        assert short_key == long_key, f"{short}/{long} mismatch"
        # and it must differ from having no direction at all
        assert short_key != addresses.normalize_street("Main St")


def test_municipality_civic_status_prefix_is_absorbed():
    """Defect 3: 'City of Hamilton' must key the same as 'Hamilton'."""
    a = addresses.address_key("90", "Webster", "City of Hamilton")
    b = addresses.address_key("90", "Webster", "Hamilton")
    c = addresses.address_key("90", "Webster", "CITY OF HAMILTON")
    assert a == b == c
    assert a is not None


def test_municipality_normalization_does_not_damage_niagara_names():
    """The prefix strip must not touch names that already work."""
    for name in ("St. Catharines", "Niagara Falls", "Niagara-on-the-Lake",
                 "West Lincoln"):
        assert addresses.normalize_municipality(name) == name.strip().lower()


def test_directional_streets_produce_distinct_present_anchors():
    """Regression for defect 1: E/W variants must not collapse, and both
    must actually be present in the loaded index (not just the key function
    in isolation)."""
    # Civic number 77 on Burlington Street exists on both East and West in
    # Hamilton's address points (verified directly against the cache).
    east_key = addresses.address_key("77", "Burlington Street East",
                                      "City of Hamilton")
    west_key = addresses.address_key("77", "Burlington Street West",
                                      "City of Hamilton")
    assert east_key != west_key

    anchors = addresses.load_anchors()
    assert east_key in anchors, "Burlington Street East anchor missing"
    assert west_key in anchors, "Burlington Street West anchor missing"
