#!/usr/bin/env python3
"""Export approved New York State news from na-research to data/wny.json.

Reads a local checkout of niagaraassembly/na-research and never writes to it.
Follows na-research's research/routines/WNY-NEWS-SITE-STATE-MODEL.md and its
site data contract (na-research f31ecf6):

- Source is intel/ only: entity_events.csv (rows that passed review and
  Saturday integration), entities.csv and event_conflicts.csv. Article
  titles and outlets come from research/news/inbox/articles.csv.
- publish_status approved/published is the editorial gate. lane, stage and
  flags describe an item; they never authorise it.
- lane "excluded" is never exported. "developing" and "corridor" items also
  need a public_note, the reader-facing explainer.
- Emitted text is the reader headline (public_headline, else the research
  headline) and public_note. Published issues (intel/issues.csv with
  intel/issue_events.csv) are exported with their summary and story list.
- Emitted text is headline and public_note. The internal summary, reviewer
  notes and dossier prose are never emitted.
- People come only from intel/event_people.csv (event_id, person_name,
  role, organization, entity_id, source_name, source_url, article_id), and
  only for exported events. Names in unreviewed inbox mentions are never read.
- amount is money committed or stated; ceiling_amount is a contract's maximum
  and is kept separate so it never enters a total.

The Western New York MAG admits any approved New York State record
(atlas/GLOSSARY.md): jurisdiction NY.

Each run prints what changed against the previous data/wny.json and the
na-research commit it was built from, so a weekly pull shows what is new.
--issue NAME also writes the same data to data/wny/issue-NAME.json, the
frozen copy an issue page reads.

Usage:
    python3 scripts/wny/export.py --research /path/to/na-research [--issue one]
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
SITE = Path(__file__).resolve().parents[2]

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
# County of each known place, used only when a record names no county.
# A one-time stopgap: na-research is asked to record county on every event,
# and county_source on each exported item says which one supplied it.
PLACE_COUNTY = {
    "North Tonawanda": "Niagara", "Niagara Falls": "Niagara", "Lockport": "Niagara",
    "Grand Island": "Erie", "Lackawanna": "Erie", "Tonawanda": "Erie", "Cheektowaga": "Erie",
    "Amherst": "Erie", "Buffalo": "Erie", "Dunkirk": "Chautauqua", "Jamestown": "Chautauqua",
    "Olean": "Cattaraugus", "Batavia": "Genesee", "Rochester": "Monroe", "Henrietta": "Monroe",
    "Penfield": "Monroe", "Webster": "Monroe", "Victor": "Ontario", "Canandaigua": "Ontario",
    "Newark": "Wayne", "Geneva": "Ontario", "Corning": "Steuben", "Elmira": "Chemung",
    "Ithaca": "Tompkins", "Auburn": "Cayuga", "Liverpool": "Onondaga", "Syracuse": "Onondaga",
}
COUNTY = re.compile(r"\b([A-Z][a-z.]+(?: [A-Z][a-z]+)?) County\b")
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


def county_of(location: str) -> tuple[str | None, str | None]:
    """(county, source): the county the record names, else the county of the
    first known place in it. A location naming places in different counties
    gets no county rather than a guess."""
    match = COUNTY.search(location)
    if match:
        return match.group(1), "record"
    hits = sorted((location.find(name), -len(name), name) for name in PLACE_COUNTY if name in location)
    counties = {PLACE_COUNTY[name] for _, _, name in hits}
    if len(counties) == 1:
        return counties.pop(), "site_gazetteer"
    return None, None


DOMAIN = re.compile(r"^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(/\S*)?$", re.IGNORECASE)


def website_of(raw: str) -> str:
    """A full https address. Bare domains in entities.csv ("solstice.com")
    gain https://; anything that is neither a URL nor a domain is dropped."""
    value = (raw or "").strip()
    if re.match(r"^https?://", value, re.IGNORECASE):
        return value
    return f"https://{value}" if DOMAIN.match(value) else ""


def money(raw: str) -> float | None:
    try:
        value = float(raw.replace(",", ""))
    except (AttributeError, ValueError):
        return None
    return value if value > 0 else None


def count_of(raw: str) -> int | None:
    """A stated whole-number count (jobs), else None."""
    try:
        value = int(str(raw).replace(",", "").strip())
    except ValueError:
        return None
    return value if value >= 0 else None


PARTIAL_DATE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")


def flags_of(raw: str) -> list[dict[str, str]]:
    """'conflict:municipality;company_reported' -> [{type, detail}, ...]."""
    out = []
    for part in (p.strip() for p in raw.split(";")):
        if part:
            kind, _, detail = part.partition(":")
            out.append({"type": kind, "detail": detail})
    return out


def cite(article: dict[str, str], url: str = "") -> dict[str, str]:
    return {
        "article_id": article.get("article_id", ""),
        "title": article.get("title", ""),
        "publisher": article.get("source_name", ""),
        "url": url or article.get("canonical_url", "").strip(),
        "kind": SOURCE_KIND.get(article.get("article_type", ""), "secondary"),
    }


def conflicts_for(event_id: str, flags: list[dict[str, str]], rows: list[dict[str, str]]) -> list[dict]:
    """One side-by-side table per conflict:X flag, from intel/event_conflicts.csv.

    Values are listed as each source states them: never averaged, picked or
    rounded.
    """
    out = []
    for flag in flags:
        if flag["type"] != "conflict" or not flag["detail"]:
            continue
        values = [{"value": r["value"], "source": r.get("source_name", ""), "url": r.get("source_url", "")}
                  for r in rows if r["event_id"] == event_id and r["conflict_field"] == flag["detail"]]
        if values:
            out.append({"field": flag["detail"], "values": values})
    return out


def build(research: Path) -> dict:
    intel = research / "intel"
    events = read_csv(intel / "entity_events.csv")
    entities = {e["entity_id"]: e for e in read_csv(intel / "entities.csv")}
    conflict_rows = read_csv(intel / "event_conflicts.csv")
    history = read_csv(intel / "event_stage_history.csv")
    articles = {a["article_id"]: a for a in read_csv(research / "research" / "news" / "inbox" / "articles.csv")}

    items, used = [], set()
    for ev in events:
        status = ev.get("publish_status", "").strip()
        lane = ev.get("lane", "").strip() or "production"
        note = ev.get("public_note", "").strip()
        if status not in PUBLISHABLE or lane == "excluded":
            continue
        if lane in NEEDS_EXPLAINER and not note:
            continue
        if ev.get("jurisdiction", "").strip() != "NY":
            continue
        location = ev.get("location", "")
        entity = entities.get(ev.get("entity_id", ""))
        place, lng = place_for(location)
        # The research's own county wins; the place lookup is a fallback.
        county, county_source = ((ev["county"].strip(), "record") if ev.get("county", "").strip()
                                 else county_of(location))

        # The event's own source first, then every article listed for it.
        sources, seen = [], set()
        primary = ev.get("source_url", "").strip()
        if primary:
            sources.append(cite(articles.get(ev.get("article_id", ""), {}), primary))
            seen.add(primary)
        for aid in (a.strip() for a in ev.get("source_article_ids", "").split(";")):
            source = cite(articles.get(aid, {"article_id": aid}))
            if aid and source["url"] and source["url"] not in seen:
                sources.append(source)
                seen.add(source["url"])

        flags = flags_of(ev.get("flags", ""))
        items.append({
            "id": ev["event_id"],
            "candidate_id": ev.get("event_candidate_id") or None,
            "type": ev.get("event_type", ""),
            "lane": lane,
            "stage": ev.get("stage", "").strip() or None,
            "flags": flags,
            "review_state": "approved",  # only decision A reaches intel/entity_events.csv
            "publish_status": status,
            "date": ev.get("event_date") or ev.get("published_date", ""),
            "place": place,
            "county": county,
            "county_source": county_source,
            "lng": lng,
            "amount": money(ev.get("amount", "")),
            "amount_type": ev.get("amount_type", "").strip() or None,
            "ceiling_amount": money(ev.get("ceiling_amount", "")),
            "currency": ev.get("currency", "") or None,
            "entity_id": ev.get("entity_id") or None,
            "entity_name": (entity or {}).get("name"),
            "headline": ev.get("public_headline", "").strip() or ev.get("headline", ""),
            "note": note,
            "jobs_added": count_of(ev.get("jobs_added", "")),
            "jobs_lost": count_of(ev.get("jobs_lost", "")),
            # Public money is kept apart from amount and never added to it.
            "incentive": {
                "program": ev.get("incentive_program", "").strip(),
                "amount": money(ev.get("incentive_amount", "")),
                "type": ev.get("incentive_type", "").strip(),
            } if ev.get("incentive_program", "").strip() else None,
            "next_step": {
                "text": ev.get("next_step", "").strip(),
                # YYYY, YYYY-MM or YYYY-MM-DD; anything else is dropped, not guessed.
                "date": ev.get("next_step_date", "").strip() if PARTIAL_DATE.match(ev.get("next_step_date", "").strip()) else "",
            } if ev.get("next_step", "").strip() else None,
            "stage_history": sorted(
                ({"stage": h["stage"], "date": h.get("as_of_date", ""), "url": h.get("source_url", "")}
                 for h in history if h.get("event_id") == ev["event_id"]),
                key=lambda h: h["date"]),
            "sources": sources,
            "conflicts": conflicts_for(ev["event_id"], flags, conflict_rows),
        })
        if entity:
            used.add(entity["entity_id"])

    exported = {i["id"] for i in items}
    people = [
        {"event_id": p["event_id"], "name": p.get("person_name", "").strip(), "role": p.get("role", "").strip(),
         "organization": p.get("organization", "").strip(), "entity_id": p.get("entity_id", "") or None,
         "source": p.get("source_name", ""), "url": p.get("source_url", "")}
        for p in read_csv(intel / "event_people.csv")
        if p.get("event_id") in exported and p.get("person_name", "").strip()
    ]

    members = read_csv(intel / "issue_events.csv")
    issues = [
        {"id": i["issue_id"], "title": i.get("title", ""), "coverage_start": i.get("coverage_start", ""),
         "coverage_end": i.get("coverage_end", ""), "published": i.get("published_date", ""),
         "summary": i.get("public_summary", "").strip(),
         "events": [m["event_id"] for m in members if m.get("issue_id") == i["issue_id"] and m.get("event_id") in exported]}
        for i in read_csv(intel / "issues.csv")
        if i.get("mag") == "WNY" and i.get("publish_status", "").strip() in PUBLISHABLE
    ]

    return {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": {"repo": "niagaraassembly/na-research", "commit": commit_of(research)},
        "items": items,
        "people": people,
        "issues": issues,
        "entities": [
            {"id": eid, "name": e["name"], "type": e.get("entity_type", ""),
             "city": e.get("hq_city", ""), "website": website_of(e.get("website", ""))}
            for eid, e in entities.items() if eid in used
        ],
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
    parser.add_argument("--out", type=Path, default=SITE / "data" / "wny.json")
    parser.add_argument("--issue", help="also write data/wny/issue-ISSUE.json for an issue page, e.g. one")
    args = parser.parse_args(argv)
    if not (args.research / "intel" / "entity_events.csv").exists():
        print(f"error: {args.research} has no intel/entity_events.csv; is it an na-research checkout?",
              file=sys.stderr)
        return 2
    if args.issue and not re.fullmatch(r"[a-z0-9-]+", args.issue):
        print("error: --issue takes lowercase letters, digits and hyphens, e.g. one", file=sys.stderr)
        return 2
    try:
        old = json.loads(args.out.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        old = {}
    data = build(args.research)
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    args.out.write_text(text, encoding="utf-8")

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
    if args.issue:
        issue = args.out.parent / "wny" / f"issue-{args.issue}.json"
        issue.parent.mkdir(parents=True, exist_ok=True)
        issue.write_text(text, encoding="utf-8")
        print(f"  issue {args.issue}: {issue}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
