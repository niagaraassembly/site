#!/usr/bin/env python3
"""Export approved New York State news from na-research to data/wny.json.

Reads a local checkout of niagaraassembly/na-research and never writes to
it. Only integrated events (intel/entity_events.csv) whose publish_status is
approved or published are exported: that status is na-research's publishing
gate, set after human review and Saturday integration. Inbox candidates are
never read.

The Western New York MAG currently admits any approved New York State record
(atlas/GLOSSARY.md, "Western New York"). A record counts as New York when its
location names NY / New York, or its company's state field does.

Usage:
    python3 scripts/wny/export.py --research /path/to/na-research [--out data/wny.json]
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

PUBLISHABLE = {"approved", "published"}

# Longitudes for placing stories on the front page's corridor line. A place
# missing here still exports; it just isn't marked on the line. Longest
# names first so "Niagara Falls" wins over "Niagara".
PLACES = {
    "North Tonawanda": -78.86, "Niagara Falls": -79.05, "Grand Island": -78.96,
    "Lackawanna": -78.82, "Tonawanda": -78.88, "Cheektowaga": -78.75, "Amherst": -78.80,
    "Buffalo": -78.88, "Lockport": -78.69, "Dunkirk": -79.33, "Jamestown": -79.24,
    "Olean": -78.43, "Batavia": -78.19, "Rochester": -77.61, "Henrietta": -77.61,
    "Penfield": -77.47, "Webster": -77.43, "Victor": -77.41, "Canandaigua": -77.28,
    "Newark": -77.10, "Geneva": -76.98, "Corning": -77.05, "Elmira": -76.81,
    "Ithaca": -76.50, "Auburn": -76.57, "Liverpool": -76.21, "Syracuse": -76.15,
}
NY_PATTERN = re.compile(r"(,\s*|\s)NY\b|New York", re.IGNORECASE)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def place_for(location: str) -> tuple[str, float | None]:
    """The first known place named in a location string, else the string itself."""
    hits = [(location.find(name), name) for name in PLACES if name in location]
    if not hits:
        return location.strip(), None
    _, name = min(hits, key=lambda h: (h[0], -len(h[1])))
    return name, PLACES[name]


def in_new_york(location: str, entity: dict[str, str] | None) -> bool:
    if NY_PATTERN.search(location or ""):
        return True
    state = (entity or {}).get("country_state_province", "")
    return "New York" in state


def amount_of(raw: str) -> float | None:
    try:
        value = float(raw.replace(",", ""))
    except (AttributeError, ValueError):
        return None
    return value if value > 0 else None


def build(research: Path) -> dict:
    events = read_csv(research / "intel" / "entity_events.csv")
    entities = {e["entity_id"]: e for e in read_csv(research / "intel" / "entities.csv")}
    articles_path = research / "research" / "news" / "inbox" / "articles.csv"
    publishers = {a["article_id"]: a.get("source_name", "")
                  for a in (read_csv(articles_path) if articles_path.exists() else [])}

    items, used = [], set()
    for ev in events:
        if ev.get("publish_status", "").strip() not in PUBLISHABLE:
            continue
        entity = entities.get(ev.get("entity_id", ""))
        if not in_new_york(ev.get("location", ""), entity):
            continue
        place, lng = place_for(ev.get("location", ""))
        source_url = ev.get("source_url", "").strip()
        items.append({
            "id": ev["event_id"],
            "type": ev.get("event_type", ""),
            "publish_status": ev["publish_status"].strip(),
            "date": ev.get("event_date") or ev.get("published_date", ""),
            "place": place,
            "lng": lng,
            "amount": amount_of(ev.get("amount", "")),
            "currency": ev.get("currency", "") or None,
            "entity_id": ev.get("entity_id") or None,
            "entity_name": (entity or {}).get("name"),
            "headline": ev.get("headline", ""),
            "summary": ev.get("summary", ""),
            "note": ev.get("public_note", ""),
            "sources": [{"publisher": publishers.get(ev.get("article_id", ""), ""), "url": source_url}]
                       if source_url else [],
        })
        if entity:
            used.add(entity["entity_id"])

    return {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": {"repo": "niagaraassembly/na-research", "commit": commit_of(research)},
        "items": items,
        "entities": [
            {"id": e["entity_id"], "name": e["name"], "city": e.get("hq_city", ""),
             "website": e.get("website", "")}
            for eid, e in entities.items() if eid in used
        ],
    }


def commit_of(research: Path) -> str | None:
    try:
        return subprocess.run(["git", "-C", str(research), "rev-parse", "--short", "HEAD"],
                              capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export approved New York State news from na-research to data/wny.json.")
    parser.add_argument("--research", type=Path, required=True, help="path to an na-research checkout")
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[2] / "data" / "wny.json")
    args = parser.parse_args(argv)
    if not (args.research / "intel" / "entity_events.csv").exists():
        print(f"error: {args.research} has no intel/entity_events.csv; is it an na-research checkout?",
              file=sys.stderr)
        return 2
    data = build(args.research)
    args.out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {len(data['items'])} approved New York items, {len(data['entities'])} companies "
          f"to {args.out} (na-research {data['source']['commit']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
