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

SOURCES = (
    {"path": CACHE / "bulk" / "043-address-points.geojson",
     "id": "niagara-address-points",
     "number": "Full_StreetNo", "street": "StreetName", "muni": "Municipality",
     "type_field": "StreetType"},
    {"path": CACHE / "hamilton" / "220-addresses.geojson",
     "id": "hamilton-addresses",
     "number": "NUMBER_COMPLETE", "street": "STREET_NAME", "muni": "MUNICIPALITY",
     "type_field": "STREET_SUFFIX_TYPE"},
)


def normalize_street(text):
    """Lower-case, strip punctuation, drop ONE trailing type word.

    Only trailing words are dropped, and never the last remaining word, so
    'Broadway' survives intact while 'Broadway Street' reduces to it.
    """
    words = re.sub(r"[^a-z0-9 ]", " ", str(text or "").lower()).split()
    if len(words) > 1 and words[-1] in TYPE_WORDS:
        words.pop()
    return " ".join(words)


def address_key(number, street, municipality):
    """Return a stable key, or None when the input cannot identify a place."""
    num = re.sub(r"[^0-9a-z]", "", str(number or "").lower())
    st = normalize_street(street)
    muni = re.sub(r"[^a-z]", "", str(municipality or "").lower())
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
            key = address_key(props.get(src["number"]), street, props.get(src["muni"]))
            point = _centroid(feature.get("geometry"))
            if not key or not point or key in anchors:
                continue
            anchors[key] = {
                "lon": point[0], "lat": point[1],
                "municipality": str(props.get(src["muni"]) or "").strip().lower(),
                "source_id": src["id"],
            }
    return anchors
