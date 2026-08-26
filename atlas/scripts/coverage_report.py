#!/usr/bin/env python3
"""Report what evidence exists where.

Six of the twelve Niagara Region lower-tier municipalities publish no spatial
data of their own. That is a finding about the region's data landscape and
belongs on the map, not in a footnote. Spec section 6.1.
"""

from units import TIER_ORDER


def summarize(units):
    """municipality -> per-tier counts plus the best tier available."""
    out = {}
    for unit in units:
        muni = unit["municipality"]
        row = out.setdefault(muni, {tier: 0 for tier in TIER_ORDER})
        row[unit["unit_tier"]] += 1
    for row in out.values():
        row["best_tier"] = next(
            (tier for tier in TIER_ORDER if row[tier] > 0), None
        )
    return out


if __name__ == "__main__":
    import units as units_module
    summary = summarize(units_module.build_units())
    width = max(len(m) for m in summary)
    for muni in sorted(summary, key=lambda m: -sum(
            v for k, v in summary[m].items() if k in TIER_ORDER)):
        row = summary[muni]
        print(f"{muni:<{width}}  parcel {row['parcel']:>7,}  "
              f"footprint {row['footprint']:>7,}  address {row['address']:>7,}  "
              f"best: {row['best_tier']}")
