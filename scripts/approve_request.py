#!/usr/bin/env python3
"""Turn an approved GitHub Issue into a committed record.

The only writer of data/*.json. Email is dropped here as well as upstream:
this is the last gate before a public commit, and the repo keeps history.
"""
import json, os, re, sys
from datetime import date
from pathlib import Path

MAX_COMMENT = 2500
BLOCK = re.compile(r"<!--DATA\s*(\{.*?\})\s*DATA-->", re.S)
REQUIRED = {
    "endorsement": ["name", "trade", "location"],
    "meetup": ["title", "starts", "venue", "contact"],
}
TARGET = {"endorsement": ("data/endorsements.json", "e"),
          "meetup": ("data/meetups.json", "m")}
PUBLIC = {
    "endorsement": ["id", "name", "trade", "location", "comment", "date"],
    "meetup": ["id", "title", "starts", "venue", "contact", "calendar_url"],
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
    if len(str(record.get("comment", ""))) > MAX_COMMENT:
        errors.append("comment-too-long")
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
    kind = record.get("kind", "endorsement")
    prefix = TARGET[kind][1]
    records = json.loads(path.read_text() or "[]")

    out = {"id": next_id(records, prefix)}
    for field in PUBLIC[kind]:
        if field == "id":
            continue
        if field == "date":
            out["date"] = record.get("date") or date.today().isoformat()
        elif field == "comment":
            if record.get("publish_comment", True) and str(record.get("comment", "")).strip():
                out["comment"] = record["comment"]
        elif str(record.get(field, "")).strip():
            out[field] = record[field]

    records.append(out)
    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n")
    return out


def apply_label_override(record, env):
    """Spec §8.3: the publish-comment decision is a LABEL on the issue, not a
    field an editor hand-edits into the JSON block. The workflow reads the
    issue's label set and passes it in; it overrides whatever the block said.
    Absent env (e.g. a local run) leaves the record untouched.
    """
    if "PUBLISH_COMMENT" in env:
        record["publish_comment"] = env["PUBLISH_COMMENT"] == "true"
    return record


def main():
    record = apply_label_override(
        extract_block(os.environ.get("ISSUE_BODY", "")), os.environ)
    errors = validate(record)
    if errors:
        print(f"invalid record, missing or bad: {', '.join(errors)}", file=sys.stderr)
        return 1
    written = append_record(TARGET[record["kind"]][0], record)
    print(f"wrote {written['id']} to {TARGET[record['kind']][0]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
