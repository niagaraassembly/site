#!/usr/bin/env python3

"""Turn an approved GitHub Issue into a committed board record.

This script is the final publication boundary for Niagara Assembly's Board.

The workflow receives a GitHub Issue created from the Board submission form.
The issue contains a machine-readable DATA block. This script:

1. extracts and decodes that block;
2. normalizes text;
3. validates the record against the Board's published schema;
4. removes all non-public fields by allowlist;
5. assigns the next Board id;
6. appends the record to data/board.json.

The script deliberately does not trust upstream input.

In particular:
- submitter name and email are never published;
- expert visibility is enforced here;
- unknown fields are ignored;
- malformed records fail closed;
- links must use HTTP(S);
- text is normalized before it reaches the public JSON;
- the issue number is retained as the publication source.

All five categories share one file and one id sequence.
"""

import json
import os
import re
import sys
from datetime import date
from pathlib import Path


MAX_TEXT = 2500

# The Apps Script places exactly one machine-readable block in the Issue body:
#
# <!--DATA
# {
#   ...
# }
# DATA-->
#
# DOTALL allows the JSON to span multiple lines.
BLOCK = re.compile(
    r"<!--DATA\s*(\{.*?\})\s*DATA-->",
    re.DOTALL,
)


# ---------------------------------------------------------------------------
# Board schema
# ---------------------------------------------------------------------------

CATEGORIES = (
    "events",
    "news",
    "spaces",
    "tools",
    "experts",
    "shows",
)

# These must remain synchronized with the live Board form and assets/js/nav.js.
#
# The values here are the actual option values, not display labels.
KINDS = {
    "events": (
        "stand-ups",
        "talks",
        "demos",
        "launches",
        "workshops",
        "training",
    ),
    "news": (
        "new projects",
        "new companies",
        "hiring",
        "expansions",
        "SAFEs",
        "other investment",
    ),
    "spaces": (
        "events",
        "office space",
        "industrial",
        "retail",
        "yard",
        "warehouse",
    ),
    "tools": (
        "electronics",
        "fabrication",
        "manufacturing",
        "warehouse",
        "other",
    ),
    "experts": (
        "software",
        "electronics",
        "fabrication",
        "manufacturing",
        "logistics",
        "management",
        "other",
    ),
    "shows": (
        "shops",
        "factories",
        "makerspaces",
        "studios",
        "labs",
    ),
}

OFFERS = (
    "offering",
    "seeking",
)

# Required fields for each public category.
REQUIRED = {
    "events": [
        "title",
        "when",
        "where",
        "contact",
    ],
    "news": [
        "title",
        "link",
        "description",
    ],
    "spaces": [
        "where",
        "description",
        "contact",
    ],
    "tools": [
        "title",
        "where",
        "description",
        "contact",
    ],
    "experts": [
        "title",
        "description",
        "contact",
    ],
    "shows": [
        "title",
        "presenter",
        "specs",
        "description",
        "link",
    ],
}

# Optional fields for each public category.
#
# `specs` is deliberately included for Events because the live submission
# form supplies it and it is useful event information.
OPTIONAL = {
    "events": [
        "presenter",
        "description",
        "specs",
        "price",
        "link",
    ],
    "news": [
        "where",
        "price",
        "contact",
    ],
    "spaces": [
        "offer",
        "title",
        "when",
        "specs",
        "price",
        "link",
    ],
    "tools": [
        "offer",
        "presenter",
        "specs",
        "price",
        "link",
    ],
    "experts": [
        "offer",
        "when",
        "where",
        "price",
        "link",
    ],
    "shows": [],
}

# Experts who selected "private" must never be published.
#
# "both" means publication to the Board is permitted.
PUBLISHABLE_VISIBILITY = (
    "public",
    "both",
)

# All categories currently share one public JSON file and one id prefix.
TARGET = {
    category: ("data/board.json", "b")
    for category in CATEGORIES
}


# ---------------------------------------------------------------------------
# Public-field allowlist
# ---------------------------------------------------------------------------

# This is deliberately an allowlist rather than a denylist.
#
# If Apps Script starts sending a new field tomorrow, that field will NOT
# automatically become public. It must first be explicitly added here.
#
# `visibility` is intentionally absent. It is a publication-routing
# instruction, not public Board content.
PUBLIC = {
    category: [
        "id",
        "category",
        "kind",
        "location",
        *REQUIRED[category],
        *OPTIONAL[category],
        "date",
        "source",
    ]
    for category in CATEGORIES
}


# ---------------------------------------------------------------------------
# Text normalization
# ---------------------------------------------------------------------------

def normalize_text(value):
    """Normalize text before it enters the public Board data.

    Handles:
    - literal backslash-n sequences: ``\\n``
    - literal slash-n sequences: ``/n``
    - Windows newlines: ``\\r\\n``
    - old Mac newlines: ``\\r``
    - surrounding whitespace

    The /n replacement is intentional because some form submissions have
    historically produced `/n` instead of `\\n`.
    """

    if not isinstance(value, str):
        return value

    value = (
        value
        .replace("\\n", "\n")
        .replace("/n", "\n")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
    )

    return value.strip()


def normalize_record(record):
    """Normalize every string field in a decoded record."""

    for key, value in record.items():
        if isinstance(value, str):
            record[key] = normalize_text(value)

    return record


# ---------------------------------------------------------------------------
# DATA block extraction
# ---------------------------------------------------------------------------

def extract_block(issue_body):
    """Extract, decode and normalize the machine-readable DATA block."""

    if not isinstance(issue_body, str) or not issue_body.strip():
        raise ValueError("issue body is empty")

    match = BLOCK.search(issue_body)

    if not match:
        raise ValueError(
            "no <!--DATA ... DATA--> block in the issue body"
        )

    try:
        record = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"DATA block contains invalid JSON: {exc}"
        ) from exc

    if not isinstance(record, dict):
        raise ValueError(
            "DATA block must contain a JSON object"
        )

    return normalize_record(record)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate(record):
    """Return a list of validation errors.

    An empty list means the record is valid.
    """

    errors = []

    category = record.get("category")

    if category not in CATEGORIES:
        return ["category"]

    kind = record.get("kind")

    if kind not in KINDS[category]:
        errors.append("kind")

    # Required fields.
    for field in REQUIRED[category]:
        value = record.get(field)

        if not isinstance(value, str) or not value.strip():
            errors.append(field)

    # Location is required for every category.
    location = record.get("location")

    if not isinstance(location, str) or not location.strip():
        errors.append("location")

    # Offer is optional, but when present it must be a known value.
    offer = record.get("offer")

    if offer and offer not in OFFERS:
        errors.append("offer")

    # Expert publication is explicitly controlled by visibility.
    if category == "experts":
        visibility = record.get("visibility")

        if visibility not in PUBLISHABLE_VISIBILITY:
            errors.append("visibility")

    # Links are optional, but when present they must be HTTP(S).
    link = record.get("link")

    if link:
        if not isinstance(link, str):
            errors.append("link-not-text")
        elif not re.match(r"^https?://", link.strip(), re.IGNORECASE):
            errors.append("link-not-http")

    # Description is the primary potentially large free-text field.
    description = record.get("description", "")

    if description and not isinstance(description, str):
        errors.append("description-not-text")
    elif isinstance(description, str) and len(description) > MAX_TEXT:
        errors.append("description-too-long")

    return errors


# ---------------------------------------------------------------------------
# IDs
# ---------------------------------------------------------------------------

def next_id(records, prefix):
    """Return the next sequential Board id.

    Existing malformed IDs are ignored rather than allowing one bad record
    to prevent future publications.
    """

    highest = 0

    for record in records:
        value = record.get("id", "")

        if not isinstance(value, str):
            continue

        match = re.search(r"-(\d+)$", value)

        if not match:
            continue

        highest = max(highest, int(match.group(1)))

    return f"{prefix}-{highest + 1:04d}"


# ---------------------------------------------------------------------------
# Public record construction
# ---------------------------------------------------------------------------

def build_public_record(records, record):
    """Construct the exact record that is allowed into board.json."""

    category = record["category"]
    prefix = TARGET[category][1]

    output = {
        "id": next_id(records, prefix),
        "category": category,
    }

    for field in PUBLIC[category]:

        if field in ("id", "category"):
            continue

        if field == "date":
            value = record.get("date")

            if value:
                output["date"] = value
            else:
                output["date"] = date.today().isoformat()

            continue

        if field == "source":
            value = record.get("source")

            if value:
                try:
                    output["source"] = int(str(value))
                except (TypeError, ValueError) as exc:
                    raise ValueError(
                        f"invalid source issue number: {value!r}"
                    ) from exc

            continue

        value = record.get(field)

        # Only non-empty values are written.
        if isinstance(value, str):
            if value.strip():
                output[field] = normalize_text(value)

        elif value is not None:
            # Public Board fields are expected to be text. Do not silently
            # serialize arbitrary objects supplied by upstream input.
            raise ValueError(
                f"field {field!r} must contain text"
            )

    return output


# ---------------------------------------------------------------------------
# File handling
# ---------------------------------------------------------------------------

def load_records(path):
    """Load the existing Board JSON."""

    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(
            f"Board data file does not exist: {path}"
        )

    try:
        text = path.read_text(encoding="utf-8")
        records = json.loads(text or "[]")
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"invalid JSON in {path}: {exc}"
        ) from exc

    if not isinstance(records, list):
        raise ValueError(
            f"{path} must contain a JSON array"
        )

    return records


def append_record(path, record):
    """Append one validated public record to board.json."""

    path = Path(path)

    records = load_records(path)

    output = build_public_record(records, record)

    records.append(output)

    serialized = json.dumps(
        records,
        indent=2,
        ensure_ascii=False,
    ) + "\n"

    path.write_text(
        serialized,
        encoding="utf-8",
    )

    return output


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    issue_body = os.environ.get("ISSUE_BODY", "")
    issue_number = os.environ.get("ISSUE_NUMBER", "").strip()

    try:
        record = extract_block(issue_body)

        # The GitHub Issue number is authoritative. Do not trust a source
        # value supplied by the form itself.
        if issue_number:
            try:
                record["source"] = int(issue_number)
            except ValueError:
                raise ValueError(
                    f"ISSUE_NUMBER is not numeric: {issue_number!r}"
                )

        errors = validate(record)

        if errors:
            print(
                "invalid record, missing or bad: "
                + ", ".join(errors),
                file=sys.stderr,
            )
            return 1

        path, _prefix = TARGET[record["category"]]

        written = append_record(path, record)

        print(
            f"wrote {written['id']} "
            f"to {path}"
        )

        return 0

    except Exception as exc:
        print(
            f"publish failed: {exc}",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
