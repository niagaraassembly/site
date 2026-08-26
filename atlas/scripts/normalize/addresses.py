#!/usr/bin/env python3
"""The address anchor index - the universal join key for the study area.

Niagara Region publishes address points for all twelve lower-tier
municipalities (208,004), including the six that publish nothing of their own.
Hamilton publishes 273,535. Together they are the only geometry covering
everywhere, which is why address-bearing tables geocode to these and roll up
to whatever unit exists above them. Spec section 6.1.

Street type words are absorbed because publishers restyle them between
editions - '2 Broadway' and '2 Broadway Street' are the same place, and
treating them as different is what produced 64 false departures.

A trailing direction (East/West/North/South) is kept, because it is
frequently the ONLY thing distinguishing two different streets that share a
name and type - 'Burlington Street East' and 'Burlington Street West' are
different places in Hamilton, and collapsing them to one key would geocode
records to the wrong location. The direction is normalized to a one-letter
suffix so long and short forms ('East' / 'E') key identically, and the
street-type word is still dropped even when a direction follows it (see
Fix round 1, atlas/logs/2026-08-23.md SS20).

Municipality strings are also normalized before keying, absorbing a leading
civic-status prefix ('City of', 'Town of', 'Township of', 'Village of',
'Municipality of', 'County of', 'Region of', 'Regional Municipality of') so
that a bare name and its full legal form key alike - Hamilton's own address
source records MUNICIPALITY as "City of Hamilton", while every caller and
every other address-bearing table says "Hamilton" (see Fix round 1).

Note on terminology: "Niagara Region" here names the upper-tier municipality
and data publisher whose address points cover its twelve lower-tier
municipalities. It is not a synonym for the Niagara Peninsula.

Licences: OGL 2.0 (Niagara Region); City of Hamilton Open Data Licence.
"""

import json
import pathlib
import re

CACHE = pathlib.Path(__file__).resolve().parents[1] / ".cache"

TYPE_WORDS = {
    "street", "st", "road", "rd", "avenue", "ave", "av", "drive", "dr",
    "boulevard", "blvd", "lane", "ln", "court", "ct", "crescent", "cres",
    "place", "pl", "parkway", "pkwy", "trail", "trl", "way", "terrace", "terr",
}

# Long and short forms of the four cardinal directions, normalized to a
# single letter so 'East' and 'E' (and 'W'/'West', etc.) key identically.
DIRECTIONS = {
    "north": "n", "n": "n",
    "south": "s", "s": "s",
    "east": "e", "e": "e",
    "west": "w", "w": "w",
}

# Leading civic-status prefixes stripped before keying a municipality name,
# e.g. 'City of Hamilton' -> 'hamilton', 'Regional Municipality of Halton'
# -> 'halton'. Only LEADING prefixes are stripped (word-anchored, requires
# a following "of"), so suffix forms like 'Wellington County' and plain
# names like 'West Lincoln' or 'St. Catharines' are left untouched.
MUNICIPALITY_PREFIX_RE = re.compile(
    r"^(regional\s+municipality|city|town|township|village|municipality|"
    r"county|region)\s+of\s+"
)

SOURCES = (
    {"path": CACHE / "bulk" / "043-address-points.geojson",
     "id": "niagara-address-points",
     "number": "Full_StreetNo", "street": "StreetName", "muni": "Municipality",
     "type_field": "StreetType", "dir_field": "StreetDir",
     "licence": "Open Government Licence 2.0 (Niagara Region)"},
    {"path": CACHE / "hamilton" / "220-addresses.geojson",
     "id": "hamilton-addresses",
     "number": "NUMBER_COMPLETE", "street": "STREET_NAME", "muni": "MUNICIPALITY",
     "type_field": "STREET_SUFFIX_TYPE", "dir_field": "STREET_SUFFIX_DIRECTION",
     "licence": "City of Hamilton Open Data Licence"},
)


def normalize_street(text):
    """Lower-case, strip punctuation, drop ONE trailing type word.

    A trailing direction (long or short form) is popped off first and
    normalized to a one-letter suffix, so the street-type word that
    precedes it is still recognized as trailing and dropped. The direction
    suffix (if any) is re-appended last, so:

      'RYMAL RD E'      -> 'rymal e'
      'Rymal Road East' -> 'rymal e'   (same key)
      'Rymal Road'      -> 'rymal'     (different key - no direction)

    Only trailing words are dropped, and never the last remaining word, so
    'Broadway' survives intact while 'Broadway Street' reduces to it, and a
    street literally named 'East' is not emptied by the direction check.
    """
    words = re.sub(r"[^a-z0-9 ]", " ", str(text or "").lower()).split()
    direction = None
    if len(words) > 1 and words[-1] in DIRECTIONS:
        direction = DIRECTIONS[words.pop()]
    if len(words) > 1 and words[-1] in TYPE_WORDS:
        words.pop()
    if direction:
        words.append(direction)
    return " ".join(words)


def normalize_municipality(text):
    """Lower-case and strip a leading civic-status prefix.

    'City of Hamilton', 'Hamilton' and 'CITY OF HAMILTON' all normalize to
    'hamilton'. Only a leading prefix is absorbed, so 'Wellington County'
    (the status word trails, not leads) and plain names such as
    'West Lincoln', 'St. Catharines', 'Niagara Falls' and
    'Niagara-on-the-Lake' pass through unchanged.
    """
    muni = str(text or "").strip().lower()
    return MUNICIPALITY_PREFIX_RE.sub("", muni, count=1)


def address_key(number, street, municipality):
    """Return a stable key, or None when the input cannot identify a place."""
    num = re.sub(r"[^0-9a-z]", "", str(number or "").lower())
    st = normalize_street(street)
    muni = re.sub(r"[^a-z]", "", normalize_municipality(municipality))
    if not num or not st:
        return None
    return f"{num}|{st}|{muni}"


def _centroid(geometry):
    if not geometry or geometry.get("type") != "Point":
        return None
    lon, lat = geometry["coordinates"][:2]
    return lon, lat


def load_anchors():
    """key -> {'lon','lat','municipality','source_id'}. First writer wins."""
    anchors = {}
    for src in SOURCES:
        if not src["path"].exists():
            continue
        with open(src["path"]) as fh:
            features = json.load(fh).get("features", [])
        for feature in features:
            props = feature.get("properties") or {}
            street = props.get(src["street"])
            if src["type_field"] and props.get(src["type_field"]):
                street = f"{street} {props[src['type_field']]}"
            if src.get("dir_field") and props.get(src["dir_field"]):
                street = f"{street} {props[src['dir_field']]}"
            key = address_key(props.get(src["number"]), street, props.get(src["muni"]))
            point = _centroid(feature.get("geometry"))
            if not key or not point or key in anchors:
                continue
            anchors[key] = {
                "lon": point[0], "lat": point[1],
                "municipality": str(props.get(src["muni"]) or "").strip().lower(),
                "source_id": src["id"],
                "licence": src["licence"],
            }
    return anchors
