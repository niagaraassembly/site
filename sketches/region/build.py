"""Rebuild the regional schematic from the homepage's lake silhouettes."""
from pathlib import Path
import re, json, html, base64, copy
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
NS='{http://www.w3.org/2000/svg}'
source=ET.fromstring(re.search(r'<svg class="home-corridor-map".*?</svg>',(ROOT/'index.html').read_text(),re.S).group())
# Editorial positions in the homepage's deliberately compressed coordinate system.
raw='''Waterloo, ON|-156|-57
Kitchener|-155|-28
Cambridge|-125|8
Guelph|-67|-60
Milton|23|-61
Oakville|88|-36
Burlington|64|14
Paris|-117|59
Brantford|-55|85
Ancaster|-5|72
Dundas|0|28
Hamilton|45|49
Stoney Creek|92|57
Grimsby|155|52
Beamsville|245|55
Vineland|302|61
Jordan|343|63
St. Catharines|385|66
Thorold|405|100
Fonthill|363|119
Welland|421|129
Wainfleet|353|151
Port Colborne|455|159
Crystal Beach|505|166
Fort Erie|535|155
Niagara Falls, ON|503|77
Niagara Falls, NY|537|87
Niagara-on-the-Lake|480|39
Queenston|506|57
Youngstown|560|39
Lewiston|557|62
Caledonia|30|119
Cayuga|125|140
Dunnville|233|157
Hagersville|51|162
Simcoe|-84|167
Port Dover|-8|179
Port Rowan|-65|188
Turkey Point|121|179
Buffalo|570|155
Tonawanda|578|119
North Tonawanda|583|100
Grand Island|549|117
Lockport|625|68
Newfane|647|47
Medina|702|62
Albion|748|60
Brockport|800|58
Batavia|735|88
Akron|660|110
Clarence|640|140
Williamsville|620|154
Cheektowaga|607|184
Hamburg|554|211
East Aurora|636|229
Angola|491|233
Silver Creek|420|258
Dunkirk|365|269
Fredonia|373|297
Westfield|260|283
North East|139|292
Erie|45|294
Waterford|76|360
Chautauqua|278|321
Jamestown|326|365
Ellicottville|516|324
Salamanca|493|375
Olean|615|385
Wellsville|750|371
Warsaw|730|228
Geneseo|808|206
Dansville|832|276
Hornell|871|333
Bath|960|329
Corning|1030|375
Elmira|1114|387
Rochester|855|46
Spencerport|821|81
Fairport|909|85
Victor|927|115
Avon|830|169
Canandaigua|963|144
Penn Yan|1009|181
Geneva|1031|131
Waterloo|1056|111
Seneca Falls|1082|124
Newark|970|87
Lyons|1000|75
Sodus|1036|49
Wolcott|1080|59
Fair Haven|1100|42
Oswego|1140|25
Fulton|1168|49
Baldwinsville|1170|89
Syracuse|1200|68
Brewerton|1204|48
Cazenovia|1272|119
Auburn|1124|131
Skaneateles|1134|138
Cortland|1181|233
Ithaca|1074|282
Watkins Glen|1032|274'''
towns={n:(float(x),float(y)) for n,x,y in (line.split('|') for line in raw.splitlines())}
major={'Hamilton','Burlington','Brantford','St. Catharines','Niagara Falls, ON','Niagara Falls, NY','Buffalo','Dunkirk','Erie','Rochester','Syracuse','Ithaca','Oswego'}
routes=[
('US 219 corridor','major','Buffalo|West Seneca|Orchard Park|Springville|Ellicottville|Salamanca'),
('403','major','Paris|Brantford|Ancaster|Hamilton|Burlington'),
('QEW','major','Oakville|Burlington|Hamilton|Stoney Creek|Grimsby|Beamsville|Vineland|Jordan|St. Catharines|Niagara Falls, ON|Fort Erie'),
('406','major','St. Catharines|Thorold|Welland'),
('3','secondary','Simcoe|Hagersville|Cayuga|Dunnville|Wainfleet|Port Colborne|Fort Erie'),
('6','secondary','Guelph|Hamilton|Caledonia|Hagersville|Port Dover'),
('Niagara Parkway','local','Niagara-on-the-Lake|Queenston|Niagara Falls, ON|Fort Erie'),
('I-190','major','Lewiston|Niagara Falls, NY|Grand Island|Buffalo'),
('I-90','major','Erie|North East|Westfield|Fredonia|Silver Creek|Angola|Hamburg|Cheektowaga|Clarence|Akron|Batavia|Victor|Waterloo|Seneca Falls|Baldwinsville|Syracuse'),
('NY 104','secondary','Lewiston|Lockport|Medina|Albion|Brockport|Rochester|Sodus|Wolcott|Oswego'),
('US 20','secondary','Hamburg|East Aurora|Warsaw|Geneseo|Avon|Canandaigua|Geneva|Auburn|Skaneateles|Cazenovia'),
('I-390','major','Rochester|Avon|Geneseo|Dansville|Bath'),
('I-86','major','Erie|Jamestown|Salamanca|Olean|Hornell|Bath|Corning|Elmira'),
('I-81','major','Brewerton|Syracuse|Cortland'),
('NY 14','secondary','Lyons|Geneva|Watkins Glen|Elmira'),
('NY 60','secondary','Dunkirk|Fredonia|Jamestown'),
('Regional links','local','Cambridge|Paris|Brantford|Caledonia|Cayuga'),
('Regional links','local','Waterloo, ON|Kitchener|Cambridge|Guelph|Milton|Oakville'),
('Regional links','local','Welland|Fonthill|Vineland'),
('Regional links','local','Port Colborne|Crystal Beach|Fort Erie'),
('Regional links','local','Rochester|Fairport|Victor|Canandaigua|Penn Yan'),
('Regional links','local','Canandaigua|Naples|Dansville'),
('Regional links','local','Seneca Falls|Ithaca|Cortland'),
('Regional links','local','Batavia|Warsaw|Ellicottville|Salamanca'),
('Regional links','local','Westfield|Chautauqua|Jamestown'),
('Regional links','local','Newark|Lyons|Wolcott|Fulton|Oswego'),
('Regional links','local','North Tonawanda|Tonawanda|Buffalo|Williamsville|Clarence')]
towns['Naples']=(943.,234.)
towns.update({'West Seneca':(609.,207.),'Orchard Park':(586.,244.),'Springville':(560.,286.)})
(OUT/'settlements.json').write_text(json.dumps([{'name':n,'x':x,'y':y,'major':n in major} for n,(x,y) in towns.items()],indent=2)+'\n')
(OUT/'connections.json').write_text(json.dumps([{'name':n,'class':k,'places':v.split('|')} for n,k,v in routes],indent=2)+'\n')
font=base64.b64encode((ROOT/'assets/fonts/comic-neue-latin-400-normal.woff2').read_bytes()).decode()
def e(v):return html.escape(str(v),quote=True)
def path(points):
    # Quietly rounded polyline; no random wobble and no invented road detail.
    p=[towns[n] for n in points]
    d=f'M{p[0][0]} {p[0][1]}'
    for i in range(1,len(p)-1):
        x,y=p[i];nx,ny=p[i+1];d+=f' L{x} {y} Q{x} {y} {(x+nx)/2} {(y+ny)/2}'
    return d+f' L{p[-1][0]} {p[-1][1]}'
def render(dark=False):
    paper,ink,soft,lake,local=('#1b1c20','#e9e7e2','#a5aaa7','#213340','#626760') if dark else ('#fcfbf9','#252b29','#67726c','#dcecf5','#b0b8ad')
    out=[f'''<svg xmlns="http://www.w3.org/2000/svg" width="3600" height="1646" viewBox="-210 -210 1570 718" role="img" aria-labelledby="title desc" style="--lake-wash:{lake}"><title id="title">Between the lakes — Niagara Assembly regional sketch</title><desc id="desc">An editorial schematic of the Hamilton, Niagara, Buffalo, Rochester and Syracuse corridor, extending to Erie and the Finger Lakes. {len(towns)} places, selected major roads and local connections. Town positions and road alignments are simplified, not a navigation map.</desc><style>
@font-face{{font-family:Sketch;src:url(data:font/woff2;base64,{font}) format('woff2')}}
text{{font-family:Sketch,'Comic Sans MS',sans-serif;fill:{ink}}}
.place{{paint-order:stroke;stroke:{paper};stroke-width:3;stroke-linejoin:round;}}
.road{{fill:none;stroke-linecap:round;stroke-linejoin:round;}}
</style><rect x="-210" y="-210" width="1570" height="718" fill="{paper}"/>''']
    for node in source:
        c=node.attrib.get('class','')
        if node.tag==NS+'defs' or c in ['home-corridor-lake','home-corridor-river','home-corridor-oneida','home-corridor-finger-lakes']:
            out.append(ET.tostring(node,encoding='unicode').replace('ns0:','').replace(':ns0','').replace('var(--lake-wash)',lake))
    for name,kind,places in routes:
        width={'major':1.5,'secondary':.85,'local':.55}[kind]
        color={'major':ink,'secondary':soft,'local':local}[kind]
        out.append(f'<path class="road" d="{path(places.split("|"))}" stroke="{color}" stroke-width="{width}"><title>{e(name)}</title></path>')
    # Two fine parallel strokes at the two international crossings.
    for a,b in [('Niagara Falls, ON','Niagara Falls, NY'),('Fort Erie','Buffalo')]:
        x,y=towns[a];xx,yy=towns[b]
        for off in [-1.3,1.3]:out.append(f'<path d="M{x} {y+off} L{xx} {yy+off}" fill="none" stroke="{ink}" stroke-width=".6"/>')
    occupied=[]
    # Place labels before minor ones so dense clusters preserve the anchors.
    offsets=[(7,-6,'start'),(7,13,'start'),(-7,-6,'end'),(-7,13,'end'),(0,-12,'middle'),(0,20,'middle'),(10,-18,'start'),(-10,24,'end'),(12,28,'start'),(-12,-25,'end')]
    # Reject labels that overlap water or existing text using sampled fill geometry
    # approximations for the large lakes; points themselves follow editorial positions.
    def overlap(a,b):return not(a[2]+3<b[0] or b[2]+3<a[0] or a[3]+2<b[1] or b[3]+2<a[1])
    placements=[]
    for n in sorted(towns,key=lambda n:(n not in major,list(towns).index(n))):
        x,y=towns[n];size=12.5 if n in major else 9.3;w=len(n)*size*.49
        candidates=[]
        for dx,dy,anchor in offsets:
            tx,ty=x+dx,y+dy;left=tx if anchor=='start' else tx-w if anchor=='end' else tx-w/2
            box=(left,ty-size,left+w,ty+3)
            collisions=sum(overlap(box,b) for b in occupied)
            # Preserve a little space around each settlement marker.
            collisions+=sum(box[0]-2<px<box[2]+2 and box[1]-2<py<box[3]+2 for key,(px,py) in towns.items() if key!=n)
            candidates.append((collisions,tx,ty,anchor,box))
            if not collisions:break
        collision,tx,ty,anchor,box=min(candidates,key=lambda a:a[0]);occupied.append(box)
        placements.append({'name':n,'box':box,'collisions':collision})
        r=2.9 if n in major else 1.8
        out.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{paper}" stroke="{ink}" stroke-width=".9"/>')
        out.append(f'<text class="place" x="{tx}" y="{ty}" text-anchor="{anchor}" font-size="{size}" font-weight="{700 if n in major else 400}">{e(n)}</text>')
    out.extend([f'<text x="-165" y="-174" font-size="11" letter-spacing="2" fill="{soft}">NIAGARA ASSEMBLY / REGIONAL SKETCH 01</text>',
      '<text x="-165" y="-139" font-size="29">Between the lakes.</text>',
      f'<text x="550" y="-38" font-size="19" letter-spacing="3" fill="{soft}">LAKE ONTARIO</text>',
      f'<text x="190" y="213" font-size="17" letter-spacing="3" fill="{soft}">LAKE ERIE</text>',
      f'<text x="197" y="115" font-size="11" letter-spacing="2" fill="{soft}">ONTARIO</text>',
      f'<text x="715" y="165" font-size="11" letter-spacing="2" fill="{soft}">NEW YORK</text>',
      f'<text x="102" y="365" font-size="10" letter-spacing="2" fill="{soft}">PENNSYLVANIA</text>',
      '<text x="-165" y="440" font-size="11">A region of places, people and connections.</text>',
      f'<path d="M-165 466 h35" stroke="{ink}" stroke-width="1.5"/><text x="-122" y="470" font-size="9.5">Major road</text>',
      f'<path d="M-20 466 h35" stroke="{soft}" stroke-width=".85"/><text x="23" y="470" font-size="9.5">Secondary road</text>',
      f'<path d="M145 466 h35" stroke="{local}" stroke-width=".55"/><text x="188" y="470" font-size="9.5">Selected local connection</text>',
      f'<text x="1290" y="470" text-anchor="end" font-size="9.5" fill="{soft}">Schematic · positions and roads simplified · not for navigation</text>','</svg>'])
    return ''.join(out),placements
for dark in [False,True]:
    svg,placements=render(dark);ET.fromstring(svg)
    (OUT/('region-dark.svg' if dark else 'region.svg')).write_text(svg)
    # Homepage variant keeps all map labels, omitting editorial header/footer.
    map_only=ET.fromstring(svg)
    map_only.set('viewBox','-210 -90 1570 520')
    map_only.set('height','1192')
    for child in list(map_only):
        tag=child.tag.split('}')[-1]
        if tag=='text' and (float(child.get('y','0')) < -100 or float(child.get('y','0')) > 420):
            map_only.remove(child)
        elif tag=='path' and child.get('d','') in ['M-165 466 h35','M-20 466 h35','M145 466 h35']:
            map_only.remove(child)
    (OUT/('region-map-dark.svg' if dark else 'region-map.svg')).write_text(ET.tostring(map_only,encoding='unicode'))

(OUT/'label-layout.json').write_text(json.dumps(placements,indent=2)+'\n')
print(f'Built light/dark SVGs: {len(towns)} places, {len(routes)} road/connection chains.')
print('Labels with unresolved collisions:',[p['name'] for p in placements if p['collisions']])
