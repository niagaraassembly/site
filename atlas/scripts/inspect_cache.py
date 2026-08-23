#!/usr/bin/env python3
"""inspect_cache.py — report the actual schema of every fetched layer.

Reads the GeoJSON files in a cache directory and reports, per layer:
  feature count · geometry type · field names · non-null rate · sample values
  and whether an address-like field exists (the geocoding dependency for tables).

Run:  python3 scripts/inspect_cache.py [--dir scripts/.cache/hamilton] [--json out.json]
"""
import json,os,re,argparse,collections

ADDR=re.compile(r'address|addr|location|street|civic|postal|folder_name',re.I)
NAME=re.compile(r'name|business|owner|operator|company',re.I)
DATE=re.compile(r'date|year|issued|applied|expiry|_dt$',re.I)

def profile(path,sample_n=400):
    try:
        d=json.load(open(path))
    except Exception as e:
        return {'error':f'{type(e).__name__}: {str(e)[:80]}'}
    fs=d.get('features') or []
    n=len(fs)
    geoms=collections.Counter((f.get('geometry') or {}).get('type') if f.get('geometry') else None for f in fs[:sample_n])
    keys=[]
    nonnull=collections.Counter(); samples={}
    for f in fs[:sample_n]:
        p=f.get('properties') or {}
        for k,v in p.items():
            if k not in keys: keys.append(k)
            if v not in (None,'',' '):
                nonnull[k]+=1
                if k not in samples: samples[k]=v
    denom=min(n,sample_n) or 1
    return {
      'features':n,
      'geometry':', '.join(f'{k or "null"}×{v}' for k,v in geoms.most_common(3)),
      'has_geometry': any(k for k in geoms if k),
      'fields':[{'name':k,'fill':round(100*nonnull[k]/denom),'sample':str(samples.get(k))[:44]} for k in keys],
      'addr_fields':[k for k in keys if ADDR.search(k)],
      'name_fields':[k for k in keys if NAME.search(k)],
      'date_fields':[k for k in keys if DATE.search(k)],
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--dir',default='scripts/.cache/hamilton')
    ap.add_argument('--json'); ap.add_argument('--full',action='store_true')
    a=ap.parse_args()
    files=sorted(f for f in os.listdir(a.dir) if f.endswith('.geojson'))
    out={}
    for fn in files:
        r=profile(os.path.join(a.dir,fn))
        out[fn]=r
        if 'error' in r:
            print(f"!! {fn}: {r['error']}"); continue
        tag='SPATIAL' if r['has_geometry'] else 'TABLE  '
        print(f"\n{tag} {fn}")
        print(f"        {r['features']:,} features · {r['geometry']}")
        if not r['has_geometry']:
            print(f"        addr fields: {r['addr_fields'] or 'NONE — cannot geocode'}")
        shown=r['fields'] if a.full else r['fields'][:12]
        for f in shown:
            print(f"          {f['name'][:30]:<30} {f['fill']:>3}%  {f['sample']}")
        if not a.full and len(r['fields'])>12:
            print(f"          … {len(r['fields'])-12} more fields")
    if a.json:
        json.dump(out,open(a.json,'w'),indent=1); print(f"\nwrote {a.json}")

if __name__=='__main__': main()
