import sys, pathlib, pytest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

import geocode
from normalize import addresses

ANCHORS = {
    addresses.address_key("2", "Broadway", "Welland"): {
        "lon": -79.24, "lat": 42.99, "municipality": "welland",
        "source_id": "niagara-address-points",
    }
}


def test_matches_despite_street_restyling():
    rows = [{"n": "2", "s": "Broadway Street", "m": "Welland"}]
    res = geocode.geocode(rows, "n", "s", "m", ANCHORS)
    assert res["rate"] == 1.0
    assert res["matched"][0]["lon"] == -79.24


def test_unmatched_rows_are_kept_not_dropped():
    rows = [{"n": "2", "s": "Broadway", "m": "Welland"},
            {"n": "999", "s": "Nowhere", "m": "Welland"}]
    res = geocode.geocode(rows, "n", "s", "m", ANCHORS)
    assert res["rate"] == 0.5
    assert len(res["unmatched"]) == 1
    assert len(res["matched"]) == 1


def test_rate_floor_raises_below_threshold():
    rows = [{"n": "999", "s": "Nowhere", "m": "Welland"}]
    res = geocode.geocode(rows, "n", "s", "m", ANCHORS)
    with pytest.raises(geocode.GeocodeRateError) as exc:
        geocode.assert_rate(res, 0.8, "test table")
    assert "test table" in str(exc.value)


def test_rate_floor_passes_above_threshold():
    rows = [{"n": "2", "s": "Broadway", "m": "Welland"}]
    res = geocode.geocode(rows, "n", "s", "m", ANCHORS)
    geocode.assert_rate(res, 0.8, "test table")


def test_municipality_default_applies_when_field_absent():
    rows = [{"n": "2", "s": "Broadway"}]
    res = geocode.geocode(rows, "n", "s", None, ANCHORS, municipality_default="Welland")
    assert res["rate"] == 1.0


def test_geocode_floor_below_observed_rate():
    """The floor is set BELOW the observed rate so it cannot already be failing."""
    observed_rate = 0.869  # 73/84 against 221-vacant-building-registry (measured 2026-08-23)
    floor = geocode.GEOCODE_FLOORS["hamilton-vacant-registry"]
    assert floor < observed_rate, (
        f"Floor ({floor:.1%}) must be strictly below observed rate ({observed_rate:.1%})"
    )
