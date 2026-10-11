# Between the lakes — regional sketch 01

A larger companion to the homepage drawing, created 11 October 2026. 106 places and 27 selected road/connection chains. Pale blue water, thin roads, open settlement dots, and the site's Comic Neue type. Light and dark versions; SVG stays sharp at any size. `region.png` is a 4800-pixel-wide export.

Open `/sketches/region/` on the local site server. The viewer offers zoom, drag-to-pan, theme switching, and downloads. Nothing is published automatically.

## Editorial geography

This is a schematic illustration, not a geographic data product or navigation map. Lake outlines inherit the homepage's stylized drawing. Positions are hand placed; north–south distances are compressed. Roads show selected relationships and general corridors, not exact alignments, junctions, access, or driveable directions. Highway chains may include towns served by a nearby interchange or connecting road. Lighter lines are selected regional connections and do not claim one continuous named road. Coverage is selective, not exhaustive.

`settlements.json` stores editorial drawing positions, **not longitude/latitude**. `connections.json` lists the depicted chains. `label-layout.json` records the final label boxes and collision counts. The builder gives major settlements first choice of label positions, then finds space around smaller ones.

## References

- [Ontario official road map](https://www.ontario.ca/page/official-road-map-ontario), including Niagara, Hamilton and southern Ontario sheets.
- [Ontario Niagara sheet](https://www.ontario.ca/files/2022-11/mto-orm-niagara-en-fr-2022-11-30.pdf): QEW, 406, regional roads and crossings.
- [NYSDOT roadway inventory](https://gis.dot.ny.gov/hostingny/rest/services/Roadways/Roadway/MapServer) and [travel maps](https://www.dot.ny.gov/travel): New York road network reference.
- [NYSDEC Lake Erie map](https://extapps.dec.ny.gov/docs/fish_marine_pdf/lakeeriesh.pdf): Buffalo–Dunkirk shoreline context.
- [NYSDEC Finger Lakes study, Figure 2.1](https://dec.ny.gov/sites/default/files/2024-08/fingerlakeswqstudy2001.pdf): lake ordering, relative shapes and Keuka's fork.
- [NYSDEC Oneida Lake](https://dec.ny.gov/places/oneida-lake-madison-onondaga-oswego-and-oneida): eastern lake context.

These references inform the drawing; no surveyed geometry or live road data is imported. Self-hosted Comic Neue is embedded in the SVG; its OFL license is at `../../assets/fonts/LICENSE-ComicNeue-OFL.txt`.

## Rebuild

From the repository root:

```sh
python3 sketches/region/build.py
inkscape sketches/region/region.svg --export-type=png --export-filename=sketches/region/region.png --export-width=4800
```

The builder reads the current homepage lake silhouettes. It writes light/dark SVGs and the three JSON files. The PNG export requires Inkscape; the viewer and SVGs have no runtime dependencies.

Southbound Buffalo connection: the US 219 corridor via West Seneca, Orchard Park, Springville and Ellicottville to Salamanca, guided by [NYSDOT Southtowns](https://www.dot.ny.gov/display/programs/scenic-byways/wny-southtowns) and its [US 219 corridor report](https://www.dot.ny.gov/regional-offices/region5/project-repository/partial_build_report.pdf). The schematic includes the urban connection from Buffalo; US 219 itself terminates at I-90.

Homepage variants: `region-map.svg` and `region-map-dark.svg` omit the editorial header, footer and legend, retaining map labels. They are generated alongside the full versions by `build.py`.
