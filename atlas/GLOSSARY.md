# Atlas — glossary of places and terms

Precision about geography is not pedantry here. Several of these names are used
loosely in ordinary speech and denote different things, and a finding stated
against the wrong one is wrong.

**Established 2026-08-23** on the project owner's direction, after a finding was
stated against "Niagara" when it was true only of Niagara Region.

---

## Geographies

### Niagara Region
**An official upper-tier municipality.** A specific, legally defined
jurisdiction of **twelve** lower-tier municipalities: St. Catharines, Niagara
Falls, Welland, Fort Erie, Port Colborne, Thorold, Grimsby, Lincoln,
Niagara-on-the-Lake, Pelham, Wainfleet, West Lincoln.

It is also a **data publisher** — the NEI, address points, NES layers and much
else in this atlas are published by Niagara Region as an organisation. Most of
the 98 uses of the term across these documents are in that publisher sense and
are correct.

**Use it only** when the legal jurisdiction or the publisher is meant.
It does **not** mean "the Niagara area".

### Niagara Peninsula
**A geography, not a jurisdiction.** Broader than Niagara Region. Includes
Niagara Region, **Hamilton**, **Haldimand County**, and extends west with
**Brantford at the western edge**.

This is the atlas's actual subject. The build has approached it from the east —
Niagara Region first, then Hamilton — and the western portion (Haldimand,
Brantford) is **not yet fully covered by fetched data**. That is deliberate
sequencing, not an oversight: the peninsula gets woven in once the core is
solid.

### Hamilton
A **single-tier** municipality (no upper tier above it), inside the peninsula.
Includes Stoney Creek, Ancaster, Dundas, Waterdown and Flamborough.

### Haldimand County
A **single-tier** municipality on the western peninsula. Publishes 425 GIS
items; verified 2026-08-23; not yet fetched.

### Study area
What the atlas currently *holds data for*: Niagara Region + Hamilton, plus the
New York side already in `data/`. Narrower than the peninsula. Say "study area"
when describing coverage, not "the peninsula".

---

## The distinction that caused a correction

**PSEZ — Provincially Significant Employment Zones.** 31 zones identified by
the Minister of Municipal Affairs and Housing on 20 December 2019 across the
Greater Golden Horseshoe.

| Stated against | Correct? |
|---|---|
| "No PSEZ in **Niagara Region**" | ✅ true — zero, under any of its twelve municipal names |
| "No PSEZ in **Niagara**" | ❌ ambiguous, and false if the peninsula is meant |
| "No PSEZ in the **Niagara Peninsula**" | ❌ **false** — Hamilton 3, Halton 2, Halton/Peel 2, Haldimand 1, Brantford 2 |

**The accurate finding is sharper than the sloppy one.** The Province designated
provincially significant employment zones across the peninsula and its
approaches — in Hamilton, Haldimand and Brantford — and **none inside Niagara
Region.** That is a statement about a jurisdiction being passed over by its
neighbours, which is a far more interesting fact than a blank map.

---

## Rules

1. **"Niagara Region" means the jurisdiction or the publisher.** Never the area.
2. **"Niagara Peninsula" means the geography**, and currently exceeds our data.
3. **"Study area" means what we hold data for.** Use it for coverage claims.
4. When a finding is bounded by a jurisdiction, **say which jurisdiction** and
   say whether the bound is the data's or the world's.
