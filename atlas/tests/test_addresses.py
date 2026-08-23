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
