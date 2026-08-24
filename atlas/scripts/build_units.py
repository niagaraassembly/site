#!/usr/bin/env python3
"""Run the normalization pipeline and write the unit index.

Usage:
    ../.venv/bin/python build_units.py
"""

import datetime
import json
import pathlib

import coverage_report
import units as units_module

OUT = pathlib.Path(__file__).resolve().parent / ".cache" / "units.json"


def run(limit_municipalities=None):
    built = units_module.build_units()
    excluded = units_module.excluded_municipality_count()
    if limit_municipalities:
        built = [u for u in built if u["municipality"] in limit_municipalities]
    summary = coverage_report.summarize(built)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump({
            "generated": datetime.date.today().isoformat(),
            "units": built,
        }, fh)
    return {
        "units_written": len(built),
        "coverage": summary,
        "path": str(OUT),
        # Units whose canonical municipality was outside the study-area
        # allow-list (item 4, consolidated fix round). A gap is shown as a
        # gap: None here would mean build_units() never ran, not zero found.
        "excluded_out_of_scope": excluded,
    }


if __name__ == "__main__":
    result = run()
    print(f"wrote {result['units_written']:,} units to {result['path']}")
    print(f"excluded {result['excluded_out_of_scope']:,} units outside the "
          f"study-area municipality allow-list")
    for muni, row in sorted(result["coverage"].items()):
        print(f"  {muni:<24} best tier: {row['best_tier']}")
