#!/usr/bin/env python3
"""Attach an organisation member's issue comment to its board record.

Only the workflow calls this, and only after it has checked that the
comment's author_association is MEMBER or OWNER. That check is the access
control; this script's job is to find the right record and keep the
comment within limits.

A record is found by `source`, the issue number stamped on it when it was
published. A comment on an issue that never produced a record — because it
was never approved, or predates the source field — is a no-op rather than
an error: nothing is wrong, there is simply nothing to attach to.
"""
import json, os, re, sys
from datetime import date
from pathlib import Path

BOARD = "data/board.json"
MAX_COMMENT = 1000
MAX_PER_RECORD = 20

# GitHub logins only. The value is rendered on a public page, and while
# board.js escapes it, a login that is not a login means something has
# gone wrong upstream and should stop here.
LOGIN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$")


def add_comment(path, issue_number, author, body, when=None):
    """Append one comment. Returns the record it landed on, or None."""
    path = Path(path)
    body = str(body or "").strip()
    if not body:
        return None
    if not LOGIN.match(str(author or "")):
        raise ValueError(f"not a GitHub login: {author!r}")

    records = json.loads(path.read_text() or "[]")
    for record in records:
        if str(record.get("source", "")) != str(issue_number):
            continue

        comments = record.setdefault("comments", [])
        if len(comments) >= MAX_PER_RECORD:
            # Drop the oldest rather than refusing: a card that silently
            # stops accepting comments is worse than one that scrolls.
            del comments[0]

        comments.append({
            "author": author,
            "body": body[:MAX_COMMENT],
            "date": when or date.today().isoformat(),
        })
        path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n")
        return record

    return None


def main():
    record = add_comment(
        BOARD,
        os.environ.get("ISSUE_NUMBER", ""),
        os.environ.get("COMMENT_AUTHOR", ""),
        os.environ.get("COMMENT_BODY", ""),
    )
    if record is None:
        print("no published record for that issue — nothing to attach")
        return 0
    print(f"attached a comment to {record['id']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
