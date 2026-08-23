import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from normalize import departures, nei


def test_industrial_sector_classification():
    assert departures.is_industrial({"primarynaics": 332319})
    assert departures.is_industrial({"primarynaics": "484121"})
    assert not departures.is_industrial({"primarynaics": 621210})
    assert not departures.is_industrial({"primarynaics": None})


def test_hopkins_is_not_a_departure():
    """nei_id 8130 is present in all four editions. It must never be emitted."""
    for baseline in (2017, 2018, 2019):
        found = departures.find_departures(baseline, 2022)
        ids = {f["properties"]["nei_id"] for f in found}
        assert 8130 not in ids, f"Hopkins emitted from the {baseline} baseline"


def test_no_departure_names_a_business_present_later():
    """The regression test named in spec 9.2. No emitted departure may have an
    id appearing in any edition after its baseline."""
    later_ids = {y: {r["nei_id"] for r in nei.load_edition(y)} for y in nei.EDITIONS}
    for baseline in (2017, 2018, 2019):
        for feat in departures.find_departures(baseline, 2022):
            nid = feat["properties"]["nei_id"]
            for year in nei.EDITIONS:
                if year > baseline:
                    assert nid not in later_ids[year], (
                        f"nei_id {nid} emitted from {baseline} but present in {year}"
                    )


def test_departure_count_is_plausible():
    """Observed 2026-08-23: 15 industrial ids from the 2019 baseline are absent
    from 2022. The old address-keyed layer claimed 68."""
    found = departures.find_departures(2019, 2022)
    assert 5 <= len(found) <= 40, f"got {len(found)}"


def test_features_carry_provenance():
    for feat in departures.find_departures(2019, 2022):
        src = feat["properties"]["source"]
        assert src["licence"].startswith("Open Government Licence 2.0")
        assert src["id"] == "niagara-nei"
        assert feat["properties"]["last_seen"] < feat["properties"]["gone_by"]
