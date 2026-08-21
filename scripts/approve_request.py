#!/usr/bin/env python3
"""Turn an approved GitHub Issue into a committed board record.

The only writer of data/board.json. `name` and `email` are dropped here as
well as upstream in the Apps Script: this is the last gate before a public
commit, and git history is permanent.

All five categories share one file and one id prefix, so ids run in a
single sequence across the board rather than five parallel ones.
"""
import json, os, re, sys
from datetime import date
from pathlib import Path

MAX_TEXT = 2500
BLOCK = re.compile(r"<!--DATA\s*(\{.*?\})\s*DATA-->", re.S)

# Mirrors assets/js/nav.js. Two levels rather than one flat type list,
# because the subnav labels are not unique: "warehouse" is both a Spaces
# kind and a Tools kind. tests/test_approve_request.py and
# tests/submit.test.mjs both assert the two files still agree.
CATEGORIES = ("events", "news", "spaces", "tools", "experts")

# The EXACT option values in the live Board form's Kind question.
KINDS = {
    "events":  ("stand-ups", "talks", "demos", "launches", "workshops", "training"),
    "news":    ("new projects", "new companies", "hiring", "expansions",
                "SAFEs", "other investment"),
    "spaces":  ("events", "office space", "industrial", "retail", "yard", "warehouse"),
    "tools":   ("electronics", "fabrication", "manufacturing", "warehouse", "other"),
    "experts": ("software", "electronics", "fabrication", "manufacturing",
                "logistics", "management", "other"),
}

# Location is FREE TEXT in the live form — required, but not from a list.
OFFERS = ("offering", "seeking")

REQUIRED = {
    "events":  ["title", "when", "where", "contact"],
    "news":    ["title", "link", "description"],
    "spaces":  ["where", "description", "contact"],
    "tools":   ["title", "where", "description", "contact"],
    "experts": ["title", "description", "contact"],
}

OPTIONAL = {
    "events":  ["presenter", "description", "price", "link"],
    "news":    ["where", "price", "contact"],
    "spaces":  ["offer", "title", "when", "specs", "price", "link"],
    "tools":   ["offer", "presenter", "specs", "price", "link"],
    "experts": ["offer", "when", "where", "price", "link"],
}

# Only an expert who chose publication may be published. "private" means
# staff follow-up only; writing such a record would be the exact leak the
# submitter opted out of, so it is rejected here rather than filtered.
PUBLISHABLE_VISIBILITY = ("public", "both")

TARGET = {category: ("data/board.json", "b") for category in CATEGORIES}

# An allowlist, not a denylist. A field absent from here is never written,
# so a new field added upstream cannot leak by default. `visibility` is
# deliberately absent: it is a routing instruction, not content.
PUBLIC = {
    category: ["id", "category", "kind", "location",
               *REQUIRED[category], *OPTIONAL[category], "date", "source"]
    for category in CATEGORIES
}


def extract_block(issue_body):
    m = BLOCK.search(issue_body or "")
    if not m:
        raise ValueError("no <!--DATA ... DATA--> block in the issue body")
    return json.loads(m.group(1))


def validate(record):
    category = record.get("category")
    if category not in REQUIRED:
        return ["category"]
    if record.get("kind") not in KINDS[category]:
        return ["kind"]

    errors = [f for f in REQUIRED[category] if not str(record.get(f, "")).strip()]

    if not str(record.get("location", "")).strip():
        errors.append("location")

    if record.get("offer") and record["offer"] not in OFFERS:
        errors.append("offer")

    if category == "experts" and record.get("visibility") not in PUBLISHABLE_VISIBILITY:
        errors.append("visibility")

    link = str(record.get("link", "")).strip()
    if link and not re.match(r"^https?://", link, re.I):
        errors.append("link-not-http")
    if len(str(record.get("description", ""))) > MAX_TEXT:
        errors.append("description-too-long")
    return errors


def next_id(records, prefix):
    n = 0
    for r in records:
        try:
            n = max(n, int(str(r.get("id", "")).split("-")[-1]))
        except ValueError:
            continue
    return f"{prefix}-{n + 1:04d}"


def append_record(path, record):
    path = Path(path)
    category = record["category"]
    prefix = TARGET[category][1]
    records = json.loads(path.read_text() or "[]")

    out = {"id": next_id(records, prefix), "category": category}
    for field in PUBLIC[category]:
        if field in ("id", "category"):
            continue
        if field == "date":
            out["date"] = record.get("date") or date.today().isoformat()
        elif field == "source":
            # The issue this came from. Not decoration: it is how a member
            # comment later finds the record it belongs to, and how an
            # unpublish would find the record to remove.
            if record.get("source"):
                out["source"] = int(record["source"])
        elif str(record.get(field, "")).strip():
            out[field] = record[field]

    records.append(out)
    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n")
    return out


def main():
    record = extract_block(os.environ.get("ISSUE_BODY", ""))
    if os.environ.get("ISSUE_NUMBER"):
        record["source"] = os.environ["ISSUE_NUMBER"]
    errors = validate(record)
    if errors:
        print(f"invalid record, missing or bad: {', '.join(errors)}", file=sys.stderr)
        return 1
    written = append_record(TARGET[record["category"]][0], record)
    print(f"wrote {written['id']} to {TARGET[record['category']][0]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
