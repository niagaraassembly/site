#!/usr/bin/env python3
"""Turn an approved GitHub Issue into a committed board record.

The only writer of data/board.json. `name` and `email` are dropped here as
well as upstream in the Apps Script: this is the last gate before a public
commit, and git history is permanent.

All six board types share one file and one id prefix, so ids run in a
single sequence across the board rather than six parallel ones.
"""
import json, os, re, sys
from datetime import date
from pathlib import Path

MAX_TEXT = 2500
BLOCK = re.compile(r"<!--DATA\s*(\{.*?\})\s*DATA-->", re.S)

BOARD_TYPES = ("standup", "talk", "demo", "space", "news", "idea")

# Mirrors BOARD_REQUIRED in assets/js/submit.js. Two gates, deliberately:
# the browser gate gives the visitor feedback, this one is what a public
# commit has to get past.
REQUIRED = {
    "standup": ["title", "when", "where", "contact"],
    "talk":    ["title", "presenter", "when", "where", "contact"],
    "demo":    ["title", "presenter", "when", "where", "contact"],
    "space":   ["where", "description", "contact"],
    "news":    ["title", "link", "description"],
    "idea":    ["title", "description"],
}

OPTIONAL = {
    "standup": ["description", "link"],
    "talk":    ["description", "link"],
    "demo":    ["description", "link"],
    "space":   ["link"],
    "news":    [],
    "idea":    ["link", "contact"],
}

TARGET = {kind: ("data/board.json", "b") for kind in BOARD_TYPES}

# An allowlist, not a denylist. A field absent from here is never written,
# so a new field added upstream cannot leak by default.
PUBLIC = {
    kind: ["id", "type", *REQUIRED[kind], *OPTIONAL[kind], "date"]
    for kind in BOARD_TYPES
}


def extract_block(issue_body):
    m = BLOCK.search(issue_body or "")
    if not m:
        raise ValueError("no <!--DATA ... DATA--> block in the issue body")
    return json.loads(m.group(1))


def validate(record):
    kind = record.get("kind")
    if kind not in REQUIRED:
        return ["kind"]
    errors = [f for f in REQUIRED[kind] if not str(record.get(f, "")).strip()]
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
    kind = record["kind"]
    prefix = TARGET[kind][1]
    records = json.loads(path.read_text() or "[]")

    out = {"id": next_id(records, prefix), "type": kind}
    for field in PUBLIC[kind]:
        if field in ("id", "type"):
            continue
        if field == "date":
            out["date"] = record.get("date") or date.today().isoformat()
        elif str(record.get(field, "")).strip():
            out[field] = record[field]

    records.append(out)
    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n")
    return out


def main():
    record = extract_block(os.environ.get("ISSUE_BODY", ""))
    errors = validate(record)
    if errors:
        print(f"invalid record, missing or bad: {', '.join(errors)}", file=sys.stderr)
        return 1
    written = append_record(TARGET[record["kind"]][0], record)
    print(f"wrote {written['id']} to {TARGET[record['kind']][0]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
