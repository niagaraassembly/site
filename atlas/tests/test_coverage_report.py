import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

import coverage_report


def test_summarize_counts_tiers_per_municipality():
    fake = [
        {"municipality": "welland", "unit_tier": "footprint"},
        {"municipality": "welland", "unit_tier": "footprint"},
        {"municipality": "wainfleet", "unit_tier": "address"},
    ]
    out = coverage_report.summarize(fake)
    assert out["welland"]["footprint"] == 2
    assert out["welland"]["best_tier"] == "footprint"
    assert out["wainfleet"]["best_tier"] == "address"


def test_best_tier_prefers_parcel():
    fake = [
        {"municipality": "niagara falls", "unit_tier": "footprint"},
        {"municipality": "niagara falls", "unit_tier": "parcel"},
    ]
    assert coverage_report.summarize(fake)["niagara falls"]["best_tier"] == "parcel"


def test_missing_tier_reports_zero_not_absent():
    fake = [{"municipality": "wainfleet", "unit_tier": "address"}]
    out = coverage_report.summarize(fake)
    assert out["wainfleet"]["parcel"] == 0
    assert out["wainfleet"]["footprint"] == 0
