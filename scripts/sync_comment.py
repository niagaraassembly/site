#!/usr/bin/env python3
"""Keep a board card's comments in step with its GitHub issue thread.

Handles all three things that can happen to a comment: created, edited and
deleted. Only the workflow calls this, and only after it has checked that
the comment author's association is MEMBER or OWNER — that check is the
access control; this script decides where the comment goes.

Comments are matched by GitHub's own comment id, not by position or by
author. An edit has to find the exact comment it changed, and a deletion
has to remove that one and no other.

A comment on an issue that never produced a record — never approved, or
its record since removed — is a no-op rather than an error. Nothing is
wrong; there is simply nothing to attach to.
"""
import json, os, re, sys
from datetime import date
from pathlib import Path

BOARD = "data/board.json"
MAX_COMMENT = 1000
MAX_PER_RECORD = 20

# GitHub logins only. The value is rendered on a public page; board.js
# escapes it, but a login that is not a login means something upstream is
# wrong and should stop here rather than be published.
LOGIN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$")


def same_issue(record, issue_number):
    """Both sides must be a real issue number. Without this guard a record
    with no `source` matches an empty issue number — str(None-ish) == "" on
    both sides — and picks up comments that have nothing to do with it."""
    source = str(record.get("source", "")).strip()
    wanted = str(issue_number).strip()
    return bool(source) and bool(wanted) and source == wanted


def find_record(records, issue_number):
    for record in records:
        if same_issue(record, issue_number):
            return record
    return None


def sync(path, action, issue_number, comment_id, author="", body="", when=None):
    """Apply one comment event. Returns (record, what_happened) or (None, reason)."""
    path = Path(path)
    records = json.loads(path.read_text() or "[]")
    record = find_record(records, issue_number)
    if record is None:
        return None, "no published record for that issue"

    comments = record.setdefault("comments", [])
    existing = next((c for c in comments if str(c.get("id", "")) == str(comment_id)), None)

    if action == "deleted":
        if existing is None:
            return None, "that comment was never published"
        comments.remove(existing)
        outcome = "removed"

    else:
        body = str(body or "").strip()
        if not body:
            # An edit that empties a comment is a deletion in all but name.
            if existing is not None:
                comments.remove(existing)
                outcome = "removed"
            else:
                return None, "empty comment"
        else:
            if not LOGIN.match(str(author or "")):
                raise ValueError(f"not a GitHub login: {author!r}")

            if existing is not None:
                existing["body"] = body[:MAX_COMMENT]
                existing["author"] = author
                outcome = "updated"
            else:
                if len(comments) >= MAX_PER_RECORD:
                    # Drop the oldest rather than refusing: a card that
                    # silently stops accepting comments is worse than one
                    # that scrolls.
                    del comments[0]
                comments.append({
                    "id": int(comment_id),
                    "author": author,
                    "body": body[:MAX_COMMENT],
                    "date": when or date.today().isoformat(),
                })
                outcome = "added"

    if not comments:
        del record["comments"]

    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n")
    return record, outcome


def main():
    record, outcome = sync(
        BOARD,
        os.environ.get("COMMENT_ACTION", "created"),
        os.environ.get("ISSUE_NUMBER", ""),
        os.environ.get("COMMENT_ID", ""),
        os.environ.get("COMMENT_AUTHOR", ""),
        os.environ.get("COMMENT_BODY", ""),
    )
    if record is None:
        print(f"nothing to do: {outcome}")
        return 0
    print(f"{outcome} a comment on {record['id']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
