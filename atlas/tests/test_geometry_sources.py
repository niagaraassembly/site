import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from normalize import geometry_sources as gs


def test_area_matches_publisher_precomputed_figure():
    """Welland zoning ships GeometrySTArea. Ours must agree. Spec D-3."""
    import json
    feats = [f for f in json.load(open(
        pathlib.Path(__file__).resolve().parents[1] /
        "scripts/.cache/welland/current-zoning.geojson"))["features"]
        if f.get("geometry") and f["properties"].get("GeometrySTArea")]
    errors = []
    for f in feats[:300]:
        ours = gs.area_m2(f["geometry"])
        theirs = f["properties"]["GeometrySTArea"]
        errors.append(abs(ours - theirs) / theirs)
    errors.sort()
    assert errors[len(errors) // 2] < 0.001, f"median error {errors[len(errors)//2]}"


def test_parcels_load_with_tier_and_area():
    parcels = gs.load_polygons(gs.PARCEL_SOURCES)
    assert len(parcels) > 70_000
    assert all(p["tier"] == "parcel" for p in parcels)
    assert all(p["area_m2"] > 0 for p in parcels[:1000])


def test_footprints_load_with_tier():
    prints = gs.load_polygons(gs.FOOTPRINT_SOURCES)
    assert len(prints) > 250_000
    assert all(p["tier"] == "footprint" for p in prints[:1000])


def test_every_polygon_carries_provenance():
    for p in gs.load_polygons(gs.PARCEL_SOURCES)[:100]:
        assert p["source"]["licence"]
        assert p["source"]["id"]
