#!/usr/bin/env python3
"""Export approved New York State news from na-research to data/wny.json.

Reads a local checkout of niagaraassembly/na-research and never writes to it.
Follows na-research's research/routines/WNY-NEWS-SITE-STATE-MODEL.md:

- Source is intel/entity_events.csv only: rows there have already passed
  review (decision A) and Saturday integration. Inbox candidates are never read.
- publish_status approved/published is the editorial gate. lane, stage and
  flags describe an item; they never authorise it.
- lane "excluded" is never exported. "developing" and "corridor" items also
  need a public_note, the reader-facing explainer.
- Emitted text is headline and public_note. The internal summary, reviewer
  notes and dossier prose are never emitted.

The Western New York MAG admits any approved New York State record
(atlas/GLOSSARY.md). A record is New York when its location names a known New
York place or county, says NY / New York, or its company's state field does.

Each run prints what changed against the previous data/wny.json and the
na-research commit it was built from, so a weekly pull shows what is new.

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
NEEDS_EXPLAINER = {"developing", "corridor"}

# Longitudes for the front page's corridor line. A place missing here still
# exports; it just isn't marked on the line.
PLACES = {
    "North Tonawanda": -78.86, "Niagara Falls": -79.05, "Grand Island": -78.96,
    "Lackawanna": -78.82, "Tonawanda": -78.88, "Cheektowaga": -78.75, "Amherst": -78.80,
    "Buffalo": -78.88, "Lockport": -78.69, "Dunkirk": -79.33, "Jamestown": -79.24,
    "Olean": -78.43, "Batavia": -78.19, "Rochester": -77.61, "Henrietta": -77.61,
    "Penfield": -77.47, "Webster": -77.43, "Victor": -77.41, "Canandaigua": -77.28,
    "Newark": -77.10, "Geneva": -76.98, "Corning": -77.05, "Elmira": -76.81,
    "Ithaca": -76.50, "Auburn": -76.57, "Liverpool": -76.21, "Syracuse": -76.15,
}
NY_COUNTIES = {
    "Albany", "Allegany", "Bronx", "Broome", "Cattaraugus", "Cayuga", "Chautauqua", "Chemung",
    "Chenango", "Clinton", "Columbia", "Cortland", "Delaware", "Dutchess", "Erie", "Essex",
    "Franklin", "Fulton", "Genesee", "Greene", "Hamilton", "Herkimer", "Jefferson", "Kings",
    "Lewis", "Livingston", "Madison", "Monroe", "Montgomery", "Nassau", "New York", "Niagara",
    "Oneida", "Onondaga", "Ontario", "Orange", "Orleans", "Oswego", "Otsego", "Putnam", "Queens",
    "Rensselaer", "Richmond", "Rockland", "St. Lawrence", "Saratoga", "Schenectady", "Schoharie",
    "Schuyler", "Seneca", "Steuben", "Suffolk", "Sullivan", "Tioga", "Tompkins", "Ulster",
    "Warren", "Washington", "Wayne", "Westchester", "Wyoming", "Yates",
}
COUNTY = re.compile(r"\b([A-Z][a-z.]+(?: [A-Z][a-z]+)?) County\b")
NY_PATTERN = re.compile(r"(,\s*|\s)NY\b|New York", re.IGNORECASE)
STATE_SUFFIX = re.compile(r"(,\s*|\s+)(NY|New York)\b", re.IGNORECASE)

# How a citation is weighed, from the article's type in na-research.
SOURCE_KIND = {
    "government_release": "primary", "regulatory_filing": "primary",
    "company_release": "company", "announcement": "company", "media_advisory": "company",
    "news_report": "secondary",
}


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def place_for(location: str) -> tuple[str, float | None]:
    """The location as the record states it, and a longitude for the line.

    The label keeps the record's own wording, minus the state, so unresolved
    claims survive ("Salt Road, Penfield or Webster"; "Rochester (buyer HQ)").
    Parts separated by ";" read as a list. The longitude is the first known
    place named.
    """
    label = ", ".join(p.strip() for p in STATE_SUFFIX.sub("", location).split(";") if p.strip())
    hits = [(location.find(name), name) for name in PLACES if name in location]
    if not hits:
        return label.strip(" ,"), None
    _, name = min(hits, key=lambda h: (h[0], -len(h[1])))
    return label.strip(" ,"), PLACES[name]


def county_of(location: str) -> str | None:
    match = COUNTY.search(location)
    return match.group(1) if match and match.group(1) in NY_COUNTIES else None


def in_new_york(location: str, entity: dict[str, str] | None) -> bool:
    if NY_PATTERN.search(location) or county_of(location):
        return True
    if any(name in location for name in PLACES):
        return True
    return "New York" in (entity or {}).get("country_state_province", "")


def amount_of(raw: str) -> float | None:
    try:
        value = float(raw.replace(",", ""))
    except (AttributeError, ValueError):
        return None
    return value if value > 0 else None


def flags_of(raw: str) -> list[dict[str, str]]:
    """'conflict:municipality;company_reported' -> [{type, detail}, ...]."""
    out = []
    for part in (p.strip() for p in raw.split(";")):
        if part:
            kind, _, detail = part.partition(":")
            out.append({"type": kind, "detail": detail})
    return out


def candidate_for(ev: dict[str, str], candidates: list[dict[str, str]]) -> dict[str, str] | None:
    """The inbox candidate an integrated event came from.

    intel/entity_events.csv does not record its candidate id, so match on
    article and headline, then on article and event type. One article can
    hold several events (ART-2026-000022 holds three contracts), so an
    ambiguous match returns None rather than guessing.
    """
    same = [c for c in candidates if c["article_id"] == ev.get("article_id") and not c.get("duplicate_of")]
    for key, value in (("headline", ev.get("headline")), ("proposed_event_type", ev.get("event_type"))):
        hits = [c for c in same if c.get(key) == value]
        if len(hits) == 1:
            return hits[0]
    return same[0] if len(same) == 1 else None


# Claims recording that a value is unknown are not values to compare.
PLACEHOLDER = re.compile(r"^(unresolved|not stated|unknown)", re.IGNORECASE)


def source_of(locator: str) -> tuple[str, str]:
    """(url, label) for a claim's source locator; label is the bare domain."""
    match = re.search(r"https?://([^/\s]+)\S*", locator)
    if not match:
        return "", ""
    return match.group(0), match.group(1).removeprefix("www.")


def conflicts_for(ids: set[str], claims: list[dict[str, str]], decisions: dict[str, str]) -> list[dict]:
    """Every sourced value from claims marked X (conflicting evidence), side by side.

    Values are listed as each source states them: never averaged, picked or
    rounded. Only the value, unit and source are emitted, never the claim's
    uncertainty_reason or reviewer notes.
    """
    out = []
    for c in claims:
        if c["event_candidate_id"] not in ids or decisions.get(c["claim_id"]) != "X":
            continue
        value = (c.get("normalized_value") or c.get("proposed_value") or "").strip()
        if not value or PLACEHOLDER.match(value):
            continue
        url, label = source_of(c.get("source_locator", ""))
        out.append({"field": c["field"], "value": value, "unit": c.get("unit_or_currency", ""),
                    "source_url": url, "source_label": label})
    return out


def build(research: Path) -> dict:
    events = read_csv(research / "intel" / "entity_events.csv")
    entities = {e["entity_id"]: e for e in read_csv(research / "intel" / "entities.csv")}
    inbox = research / "research" / "news" / "inbox"
    articles = {a["article_id"]: a for a in read_csv(inbox / "articles.csv")}
    candidates = read_csv(inbox / "event_candidates.csv")
    claims = read_csv(inbox / "claim_candidates.csv")
    decisions: dict[str, str] = {}
    for d in read_csv(research / "research" / "news" / "reviewed" / "review_decisions.csv"):
        if d.get("record_type") == "CLAIMS":
            decisions[d["record_id"]] = d["decision"]  # later rows supersede earlier ones

    items, used = [], set()
    for ev in events:
        status = ev.get("publish_status", "").strip()
        lane = ev.get("lane", "").strip() or "production"
        note = ev.get("public_note", "").strip()
        if status not in PUBLISHABLE or lane == "excluded":
            continue
        if lane in NEEDS_EXPLAINER and not note:
            continue
        location = ev.get("location", "")
        entity = entities.get(ev.get("entity_id", ""))
        if not in_new_york(location, entity):
            continue
        place, lng = place_for(location)
        article = articles.get(ev.get("article_id", ""), {})
        url = ev.get("source_url", "").strip() or article.get("canonical_url", "").strip()
        sources = [cite(article, url)] if url else []
        # Duplicate reports are extra sources on this item, never separate items.
        candidate = candidate_for(ev, candidates)
        group = {candidate["event_candidate_id"]} if candidate else set()
        dup_articles = [a for a in articles.values() if a.get("duplicate_of") == ev.get("article_id")]
        for c in candidates:
            if candidate and c.get("duplicate_of") == candidate["event_candidate_id"]:
                group.add(c["event_candidate_id"])
                dup_articles.append(articles.get(c["article_id"], {}))
        seen = {s["url"] for s in sources}
        for a in dup_articles:
            a_url = a.get("canonical_url", "").strip()
            if a_url and a_url not in seen:
                sources.append(cite(a, a_url))
                seen.add(a_url)
        items.append({
            "id": ev["event_id"],
            "type": ev.get("event_type", ""),
            "lane": lane,
            "stage": ev.get("stage", "").strip() or None,
            "flags": flags_of(ev.get("flags", "")),
            "review_state": "approved",  # only decision A reaches intel/entity_events.csv
            "publish_status": status,
            "date": ev.get("event_date") or ev.get("published_date", ""),
            "place": place,
            "county": county_of(location),
            "lng": lng,
            "amount": amount_of(ev.get("amount", "")),
            "currency": ev.get("currency", "") or None,
            "entity_id": ev.get("entity_id") or None,
            "entity_name": (entity or {}).get("name"),
            "headline": ev.get("headline", ""),
            "note": note,
            "sources": sources,
            "conflicts": conflicts_for(group, claims, decisions),
        })
        if entity:
            used.add(entity["entity_id"])

    return {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": {"repo": "niagaraassembly/na-research", "commit": commit_of(research)},
        "items": items,
        "entities": [
            {"id": eid, "name": e["name"], "type": e.get("entity_type", ""),
             "city": e.get("hq_city", ""), "website": e.get("website", "")}
            for eid, e in entities.items() if eid in used
        ],
    }


def cite(article: dict[str, str], url: str) -> dict[str, str]:
    return {
        "article_id": article.get("article_id", ""),
        "title": article.get("title", ""),
        "publisher": article.get("source_name", ""),
        "url": url,
        "kind": SOURCE_KIND.get(article.get("article_type", ""), "secondary"),
    }


def changes(old: dict, new: dict) -> dict[str, list[str]]:
    """Item ids added, changed and removed since the previous export."""
    before = {i["id"]: i for i in old.get("items", [])}
    after = {i["id"]: i for i in new.get("items", [])}
    return {
        "added": sorted(after.keys() - before.keys()),
        "changed": sorted(i for i in after.keys() & before.keys() if after[i] != before[i]),
        "removed": sorted(before.keys() - after.keys()),
    }


def commit_of(research: Path) -> str | None:
    try:
        return subprocess.run(["git", "-C", str(research), "rev-parse", "--short", "HEAD"],
                              capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Export approved New York State news from na-research to data/wny.json.")
    parser.add_argument("--research", type=Path, required=True, help="path to an na-research checkout")
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[2] / "data" / "wny.json")
    args = parser.parse_args(argv)
    if not (args.research / "intel" / "entity_events.csv").exists():
        print(f"error: {args.research} has no intel/entity_events.csv; is it an na-research checkout?",
              file=sys.stderr)
        return 2
    try:
        old = json.loads(args.out.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        old = {}
    data = build(args.research)
    args.out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    was = (old.get("source") or {}).get("commit")
    now = data["source"]["commit"]
    print(f"na-research {was or '(none)'} -> {now}: {len(data['items'])} items, "
          f"{len(data['entities'])} companies written to {args.out}")
    for kind, ids in changes(old, data).items():
        if ids:
            print(f"  {kind}: {', '.join(ids)}")
    if was and now and was != now:
        print(f"  review upstream: git -C {args.research} log --oneline {was}..{now} "
              f"-- intel/ research/news/reviewed/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
