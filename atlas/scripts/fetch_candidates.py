#!/usr/bin/env python3
"""fetch_candidates.py — bulk-retrieve every reachable layer in sources/manifest.json.

Writes to scripts/.cache/bulk/<n>-<slug>.<ext> and appends a JSON-lines
receipt per layer to scripts/.cache/bulk/_receipts.jsonl.

Resumable: a layer whose output already exists and parses is skipped.
Run:  python3 scripts/fetch_candidates.py [--only N,N,N] [--workers 4]
"""
import json,os,re,sys,time,urllib.request,urllib.error,urllib.parse,argparse
import concurrent.futures as cf

HERE=os.path.dirname(os.path.abspath(__file__))
ATLAS=os.path.dirname(HERE)
OUT=os.path.join(HERE,'.cache','bulk')
MAN=os.path.join(ATLAS,'sources','manifest.json')  # overridable via --manifest/--out
UA={'User-Agent':'Mozilla/5.0 (compatible; NiagaraAtlas/1.0; +local research cache)'}
os.makedirs(OUT,exist_ok=True)

def slug(s):
    return re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',s.lower())).strip('-')[:58]

def fetch(u,timeout=120,tries=3):
    last=None
    for i in range(tries):
        try:
            r=urllib.request.Request(u,headers=UA)
            with urllib.request.urlopen(r,timeout=timeout) as f: return f.read()
        except Exception as e:
            last=e; time.sleep(1.5*(i+1))
    raise last

def jfetch(u,**k): return json.loads(fetch(u,**k).decode('utf-8','replace'))

def fetch_rest(ep,log,path):
    """Page a layer out as GeoJSON, STREAMING to disk.

    Features are written as they arrive rather than accumulated. A large
    layer (Hamilton contours: 221,518 polylines) otherwise holds every
    feature as a Python dict and exhausts memory long before it finishes.
    """
    meta=jfetch(ep+'?f=json',timeout=60)
    maxrec=meta.get('maxRecordCount') or 1000
    maxrec=min(maxrec,2000)
    adv=meta.get('advancedQueryCapabilities') or {}
    paging=adv.get('supportsPagination',meta.get('supportsPagination',True))
    # Attribute-only layers (geometryType absent) reject outSR and f=geojson.
    is_table = not meta.get('geometryType')
    sr = '' if is_table else '&outSR=4326'
    fmt = 'json' if is_table else 'geojson'
    def pages():
        """Yield lists of features, one page at a time. Never holds the whole set."""
        if paging:
            off=0
            while True:
                q=(f"{ep}/query?where=1%3D1&outFields=*{sr}&f={fmt}"
                   f"&resultOffset={off}&resultRecordCount={maxrec}")
                d=json.loads(fetch(q,timeout=180).decode('utf-8','replace'))
                if 'error' in d: raise RuntimeError(str(d['error'])[:120])
                raw=d.get('features') or []
                yield ([{"type":"Feature","geometry":None,"properties":x.get('attributes',{})}
                        for x in raw] if is_table else raw)
                if len(raw)<maxrec: return
                off+=maxrec
                if off>2_000_000: return
        else:
            ids=jfetch(f"{ep}/query?where=1%3D1&returnIdsOnly=true&f=json",timeout=120)
            oids=ids.get('objectIds') or []
            for i in range(0,len(oids),maxrec):
                chunk=oids[i:i+maxrec]
                q=(f"{ep}/query?objectIds={','.join(map(str,chunk))}"
                   f"&outFields=*{sr}&f={fmt}")
                d=json.loads(fetch(q,timeout=180).decode('utf-8','replace'))
                raw=d.get('features') or []
                yield ([{"type":"Feature","geometry":None,"properties":x.get('attributes',{})}
                        for x in raw] if is_table else raw)

    n=0
    tmp=path+'.part'
    with open(tmp,'w') as fh:
        fh.write('{"type":"FeatureCollection","features":[')
        for fs in pages():
            for f in fs:
                if n: fh.write(',')
                fh.write(json.dumps(f,separators=(',',':')))
                n+=1
            log(f"      +{len(fs):>6}  total {n:>7}")
            del fs
        fh.write(']}')
    os.replace(tmp,path)
    return n

def run_layer(job):
    n,idx,lay=job
    title=lay['title']; ep=lay.get('endpoint'); acc=lay.get('access')
    base=f"{n:03d}-{slug(title)}"+("" if idx==0 else f"-{idx}")
    lines=[]
    log=lambda m: lines.append(m)
    rec={'n':n,'title':title,'org':lay['org'],'access':acc,'endpoint':ep,
         'license':lay.get('license'),'fetched_at':time.strftime('%Y-%m-%d')}
    try:
        if acc=='rest':
            path=os.path.join(OUT,base+'.geojson')
            if os.path.exists(path) and os.path.getsize(path)>80:
                try:
                    d=json.load(open(path)); rec.update(status='skip',features=len(d.get('features',[])),
                        path=os.path.relpath(path,ATLAS),bytes=os.path.getsize(path))
                    return rec,lines
                except Exception: pass
            n=fetch_rest(ep,log,path)
            rec.update(status='ok',features=n,
                       path=os.path.relpath(path,ATLAS),bytes=os.path.getsize(path))
        elif acc=='ago-cache':
            path=os.path.join(OUT,base+'.geojson')
            if os.path.exists(path) and os.path.getsize(path)>80:
                d=json.load(open(path)); rec.update(status='skip',features=len(d.get('features',[])),
                    path=os.path.relpath(path,ATLAS),bytes=os.path.getsize(path)); return rec,lines
            b=fetch(ep,timeout=300)
            open(path,'wb').write(b)
            try: nf=len(json.loads(b.decode('utf-8','replace')).get('features',[]))
            except Exception: nf=None
            rec.update(status='ok',features=nf,path=os.path.relpath(path,ATLAS),bytes=len(b))
        elif acc=='file':
            ext=(os.path.splitext(urllib.parse.urlparse(ep).path)[1] or '.dat')[:6]
            if ext.lower() not in ('.csv','.json','.geojson','.zip','.xlsx','.kml','.xml','.shp'): ext='.dat'
            path=os.path.join(OUT,base+ext)
            if os.path.exists(path) and os.path.getsize(path)>0:
                rec.update(status='skip',path=os.path.relpath(path,ATLAS),bytes=os.path.getsize(path)); return rec,lines
            b=fetch(ep,timeout=240)
            open(path,'wb').write(b)
            rec.update(status='ok',path=os.path.relpath(path,ATLAS),bytes=len(b),features=None)
        elif acc in ('image-service','map-service'):
            path=os.path.join(OUT,base+'.service.json')
            m=jfetch(ep+'?f=json',timeout=90)
            json.dump(m,open(path,'w'),indent=1)
            rec.update(status='metadata-only',path=os.path.relpath(path,ATLAS),
                       bytes=os.path.getsize(path),features=None,
                       note='raster service — metadata captured; imagery served as tiles, not a bulk file')
        else:
            rec.update(status='skip-no-endpoint')
    except Exception as e:
        rec.update(status='fail',error=f"{type(e).__name__}: {str(e)[:150]}")
    return rec,lines

def main():
    global OUT
    ap=argparse.ArgumentParser()
    ap.add_argument('--only'); ap.add_argument('--workers',type=int,default=4)
    ap.add_argument('--manifest',default=MAN); ap.add_argument('--out',default=OUT)
    a=ap.parse_args()
    OUT=a.out; os.makedirs(OUT,exist_ok=True)
    items=json.load(open(a.manifest))
    only=set(int(x) for x in a.only.split(',')) if a.only else None
    jobs=[]
    for it in items:
        if only and it['n'] not in only: continue
        for i,l in enumerate(it['layers']):
            if l['status']=='ok': jobs.append((it['n'],i,l))
    print(f"[fetch] {len(jobs)} layers queued, {a.workers} workers",flush=True)
    rp=open(os.path.join(OUT,'_receipts.jsonl'),'a')
    done=0
    with cf.ThreadPoolExecutor(max_workers=a.workers) as ex:
        for rec,lines in ex.map(run_layer,jobs):
            done+=1
            f=rec.get('features'); f=f"{f:,}" if isinstance(f,int) else '-'
            b=rec.get('bytes') or 0
            print(f"[{done:>3}/{len(jobs)}] {rec['status']:<14} #{rec['n']:<4} {rec['title'][:44]:<44} {f:>9} {b/1e6:>7.1f}MB",flush=True)
            if rec['status']=='fail': print(f"        !! {rec.get('error')}",flush=True)
            rp.write(json.dumps(rec)+'\n'); rp.flush()
    rp.close()
    print("[fetch] complete",flush=True)

if __name__=='__main__': main()
