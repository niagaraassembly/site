import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from normalize import nei


def test_norm_props_lowercases_and_strips_underscores():
    f = {"properties": {"NEI_ID": 8130, "SizeRange_Employees": "Small"}}
    p = nei.norm_props(f)
    assert p["neiid"] == 8130
    assert p["sizerangeemployees"] == "Small"


def test_every_edition_loads_with_ids():
    for year in nei.EDITIONS:
        recs = nei.load_edition(year)
        assert len(recs) > 10_000, f"{year} loaded {len(recs)} records"
        assert all(r["nei_id"] is not None for r in recs)


def test_editions_intersect_by_id():
    """Silent zero from schema drift is the failure mode this guards. Spec 5.6."""
    ids = {y: {r["nei_id"] for r in nei.load_edition(y)} for y in nei.EDITIONS}
    for a, b in zip(nei.EDITIONS, nei.EDITIONS[1:]):
        overlap = ids[a] & ids[b]
        assert len(overlap) > 5_000, f"{a}->{b} intersection is {len(overlap)}"


def test_hopkins_present_in_every_edition():
    """The named case behind the departures defect. Log 2026-08-23 section 14."""
    for year in nei.EDITIONS:
        recs = {r["nei_id"]: r for r in nei.load_edition(year)}
        assert 8130 in recs, f"nei_id 8130 missing from {year}"
        assert "hopkins" in recs[8130]["props"]["businessname"].lower()
