import sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

import build_units


def test_pipeline_writes_units_and_a_manifest():
    out = build_units.run(limit_municipalities={"welland"})
    assert out["units_written"] > 1_000
    assert out["coverage"]["welland"]["best_tier"] == "footprint"
    assert pathlib.Path(out["path"]).exists()


def test_output_is_valid_json_with_provenance():
    out = build_units.run(limit_municipalities={"welland"})
    with open(out["path"]) as fh:
        data = json.load(fh)
    assert data["units"]
    assert data["generated"]
    for unit in data["units"][:50]:
        assert unit["source"]["id"]
