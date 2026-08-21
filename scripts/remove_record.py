#!/usr/bin/env python3
"""Take a record off the board when its issue loses the `approved` label.

The counterpart to approve_request.py. Records carry `source`, the issue
number they were published from, which is what makes this possible at all:
without it there is no way to say which record an issue produced.

Removing is not the same as never publishing. The record and any comments
on it are gone from data/board.json, but git history keeps every version
of that file — this un-publishes, it does not erase. Anything genuinely
sensitive needs history rewritten, not a label removed.
"""
import json, os, sys
from pathlib import Path

BOARD = "data/board.json"


def same_issue(record, issue_number):
    """Both sides must be a real issue number. Without this guard a record
    with no `source` matches an empty issue number — str(None-ish) == "" on
    both sides — and gets swept up by an event that has nothing to do with
    it."""
    source = str(record.get("source", "")).strip()
    wanted = str(issue_number).strip()
    return bool(source) and bool(wanted) and source == wanted


def remove_record(path, issue_number):
    """Remove the record published from that issue. Returns it, or None."""
    path = Path(path)
    records = json.loads(path.read_text() or "[]")

    kept = [r for r in records if not same_issue(r, issue_number)]
    if len(kept) == len(records):
        return None

    removed = next(r for r in records if same_issue(r, issue_number))
    path.write_text(json.dumps(kept, indent=2, ensure_ascii=False) + "\n")
    return removed


def main():
    issue_number = os.environ.get("ISSUE_NUMBER", "")
    if not str(issue_number).strip():
        print("no ISSUE_NUMBER given", file=sys.stderr)
        return 1

    removed = remove_record(BOARD, issue_number)
    if removed is None:
        print(f"no record published from #{issue_number} — nothing to remove")
        return 0
    print(f"removed {removed['id']} ({removed.get('title') or removed.get('where') or '—'})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
