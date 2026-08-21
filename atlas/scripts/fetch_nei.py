#!/usr/bin/env python3
"""Build the industrial departure layer from Niagara's Employment Inventory.

The Region publishes a geocoded census of every business — address, NAICS,
sector, employee band — once every year or two. Four editions exist. Diffing
them turns a static directory into a change signal: an address that had an
industrial occupier in an early edition and has nothing in the latest is a
site that emptied, which is the closest thing to an availability feed that
exists in Ontario without MLS.

Writes into atlas/data/. Standard library only.

Two things that will bite whoever edits this:

1. **Field names change case between editions.** 2019 ships `PrimaryNAICS`,
   2022 ships `primarynaics`. The schema is stable; the casing is not. Every
   property lookup goes through lower-cased keys, or the filter silently
   matches nothing and the layer comes out empty rather than wrong-looking.

2. **Resources are resolved by CKAN package name, not by URL.** The download
   URLs carry resource UUIDs that change when the Region republishes.

Licence: Open Government Licence 2.0 (Niagara Region). Attribution required.

Usage:
    python3 fetch_nei.py [--refresh]
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date

CKAN = 'https://niagaraopendata.ca/api/3/action'
USER_AGENT = 'HamiltonNiagaraIndustrialAtlas/0.1 (+https://github.com/niagaraassembly/site)'

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, '..', 'data')
CACHE_DIR = os.path.join(HERE, '.cache')

# Oldest first. The baseline is the first, the present is the last.
EDITIONS = [
    ('2017', '2017-niagara-employment-inventory'),
    ('2018', '2018-niagara-employment-inventory'),
    ('2019', '2019-niagara-employment-inventory'),
    ('2022', '2022-niagara-employment-inventory'),
]

SOURCE = {
    'name': 'Niagara Region Employment Inventory',
    'url': 'https://niagaraopendata.ca',
    'license': 'Open Government Licence 2.0 (Niagara Region)',
    'attribution': 'Contains information licensed under the Open Government '
                   'Licence – Niagara Region',
}

# Manufacturing, wholesale, transportation and warehousing. Wholesale is in
# because it occupies the same buildings and competes for the same sites;
# excluding it would miss half the warehouse stock.
INDUSTRIAL_NAICS_PREFIXES = {'31', '32', '33', '41', '48', '49'}


def fetch(url, cache_name, refresh=False):
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, cache_name)
    if os.path.exists(path) and not refresh:
        with open(path, 'rb') as fh:
            return fh.read()

    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(request, timeout=180) as response:
        body = response.read()
    with open(path, 'wb') as fh:
        fh.write(body)
    return body


def geojson_resource(package):
    """The GeoJSON download URL for a CKAN package, found by format."""
    body = fetch(f'{CKAN}/package_show?id={package}',
                 f'pkg-{package}.json', refresh=True)
    result = json.loads(body)['result']
    for resource in result.get('resources', []):
        if (resource.get('format') or '').upper() == 'GEOJSON':
            return resource['url']
    raise SystemExit(f'no GeoJSON resource on package {package}')


def props(feature):
    """Lower-cased keys. See the module docstring — this is the whole reason
    the 2019 and 2022 editions can be compared at all."""
    return {k.lower(): v for k, v in (feature.get('properties') or {}).items()}


def address_key(p):
    number = str(p.get('businessstreetnumber') or '').strip().lower()
    street = str(p.get('businessstreetname') or '').strip().lower()
    muni = str(p.get('municipality') or '').strip().lower()
    if not number or not street:
        return None
    return (number, street, muni)


def is_industrial(p):
    return str(p.get('primarynaics') or '')[:2] in INDUSTRIAL_NAICS_PREFIXES


def load_edition(year, package, refresh):
    url = geojson_resource(package)
    body = fetch(url, f'nei{year}.geojson', refresh=refresh)
    features = json.loads(body).get('features', [])
    print(f'  {year}: {len(features):>6} records', file=sys.stderr)
    return features


def build(refresh=False):
    editions = {}
    print('reading editions', file=sys.stderr)
    for year, package in EDITIONS:
        try:
            editions[year] = load_edition(year, package, refresh)
        except (urllib.error.HTTPError, urllib.error.URLError, SystemExit) as err:
            print(f'  {year}: unavailable ({err}) — skipped', file=sys.stderr)

    if len(editions) < 2:
        raise SystemExit('need at least two editions to compute a departure')

    years = sorted(editions)
    latest = years[-1]

    # Every address occupied by anything at all in the latest edition. A site
    # is only "emptied" if NOTHING is there now — an industrial unit that
    # became a gym is a change of use, not an available site.
    occupied_now = set()
    industrial_now = set()
    for feature in editions[latest]:
        p = props(feature)
        key = address_key(p)
        if not key:
            continue
        occupied_now.add(key)
        if is_industrial(p):
            industrial_now.add(key)

    # Walk backwards from the most recent prior edition, so a departure is
    # attributed to the last year it was actually seen occupied.
    departures = {}
    for year in reversed(years[:-1]):
        for feature in editions[year]:
            p = props(feature)
            key = address_key(p)
            if not key or key in occupied_now or key in departures:
                continue
            if not is_industrial(p):
                continue
            departures[key] = {
                'type': 'Feature',
                'geometry': feature.get('geometry'),
                'properties': {
                    'last_seen': year,
                    'gone_by': latest,
                    'business': p.get('businessname'),
                    'municipality': p.get('municipality'),
                    'address': f"{p.get('businessstreetnumber')} "
                               f"{p.get('businessstreetname')}".strip(),
                    'naics': str(p.get('primarynaics') or ''),
                    'sector': p.get('primarysector'),
                    'industry': p.get('industry'),
                    # Field name differs by edition, like everything else here.
                    'size': p.get('sizerangeemployees') or p.get('employeesizerange'),
                },
            }

    features = sorted(departures.values(),
                      key=lambda f: (f['properties']['municipality'] or '',
                                     f['properties']['address'] or ''))

    # `atlas`, not `metadata`: app.js reads collection.atlas.feature_count to
    # put a count on the sidebar row. A different key means the row silently
    # shows no count while every other layer does.
    collection = {
        'type': 'FeatureCollection',
        'atlas': {
            'layer': 'departure',
            'dataset': 'Industrial departures',
            'feature_count': len(features),
            'freshness': 'UPDATED ANNUALLY',
            'retrieved_at': date.today().isoformat(),
            'coverage': 'Niagara Region',
            **SOURCE,
            'derived': 'Industrial addresses occupied in an earlier edition and '
                       'vacant in the latest. Not a listing: a site can be empty '
                       'and not for sale, or sold and not yet reoccupied.',
            'editions_used': years,
            'baseline': years[0],
            'latest': latest,
            'naics_prefixes': sorted(INDUSTRIAL_NAICS_PREFIXES),
        },
        'features': features,
    }

    os.makedirs(DATA_DIR, exist_ok=True)
    out = os.path.join(DATA_DIR, 'niagara-departures.geojson')
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump(collection, fh, ensure_ascii=False)

    print(f'\nindustrial occupiers now:  {len(industrial_now)}', file=sys.stderr)
    print(f'departed sites written:    {len(collection["features"])}', file=sys.stderr)
    print(f'-> {os.path.relpath(out, HERE)}', file=sys.stderr)
    return collection


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true',
                        help='ignore the local cache and re-download')
    args = parser.parse_args()
    build(refresh=args.refresh)
    return 0


if __name__ == '__main__':
    sys.exit(main())
