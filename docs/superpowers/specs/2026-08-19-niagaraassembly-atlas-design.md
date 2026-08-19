# Niagara Assembly — Atlas Refocus Design

- Date: 2026-08-19
- Status: design approved in conversation; implementation plan not yet written
- Companion spec: `2026-08-19-niagaraassembly-manifesto-site-design.md` — **ships first**
- Lives at: `atlas/` in this repo, forked from `patonhall/site` `atlas/` on 2026-08-19

---

## 1. What this is

The single additional web application that joins the manifesto site: a map of the shared region, refocused from *"what does the industrial economy look like?"* to **"where is old industrial fabric being brought back into business use — and where could it be?"**

The Atlas is the manifesto's movement 6 in map form. The statement argues that this region built the rooms before and is reopening them now; the Atlas shows where.

## 2. Sequencing

**The manifesto ships alone and works with no Atlas.** This spec does not begin until the site, its two pipelines and the statement are live. Rationale: the manifesto has a date on it and the map does not, and a single spec would make the statement wait on the map.

After the Atlas is advancing, pertinent findings get pulled out of the data streams and highlighted — in posts, in the statement's later revisions, in meetup agendas. That extraction is a third phase, not part of this spec.

## 3. The fork

`site/atlas` was copied wholesale into `atlas/` on 2026-08-19 — a faithful copy, response caches excluded. **The Paton Hall copy is left alone and continues to exist.** This is a fork, not a move.

Divergence is planned work, not accident. The first implementation task is the rebrand:

- `atlas/index.html:64` still reads `<span class="footbar__brand">Paton</span>` → Niagara Assembly
- Titles, meta description, and any Paton Hall linkage in `README.md` / `INTEGRATION.md`
- `INTEGRATION.md`'s note that the atlas "lives in this folder inside the Paton Hall site repo" is now false

Everything else — the provenance model, the normalized feature schema, the region switching, the per-layer freshness states, the source registries, the ingestion scripts and `OPERATIONS.md`'s runbook — carries over unchanged and is the reason forking beats rebuilding.

## 4. The refocus

Renewal becomes the centre of the map; industry, rail and zoning become context around it.

Concretely this is a reordering and regrouping of the `LAYERS` table in `atlas/app.js` (currently 11 layers in three groups: `LAND & PLANNING`, `PLACES`, `INFRASTRUCTURE`), plus new layers. Proposed groups:

| Group | Contains |
|---|---|
| **RENEWAL** *(new, default-on)* | Reuse (curated), brownfield & recorded disused, remediation parcels, vacant buildings, BOAs, development applications |
| **LAND** | Employment lands, industrial zoning, industrial land, industrial parcels |
| **PLACES** | Industrial places, regulated facilities |
| **INFRASTRUCTURE** | Rail (×2), truck routes |

## 5. Layer plan

### 5.1 Already built — promote

| Layer | Count | Note |
|---|---|---|
| `osm-disused` — "Brownfield & recorded disused" | **362** (170 WNY) | Both countries. From OSM `disused:*` and `landuse=brownfield`. The existing core of the renewal story. |
| `us-brownfield` — NYS Brownfield Opportunity Areas | 11 polygons | Authoritative and state-designated, but `source_modified` is 2021-11 and freshness is correctly marked `HISTORICAL`. Keep the marking honest. |

### 5.2 Already identified in the Atlas's own backlog — load them

The reconnaissance already found exactly what this refocus needs. None of this requires new discovery work:

1. **Hamilton Vacant Building Registry** — catalogued, not loaded. `BACKLOG.md` names it one of the two highest-value unloaded Hamilton datasets. Directly on-topic: it is the closest thing either jurisdiction publishes to "this building is empty."
2. **NYS DEC `Remediation_Parcels`** — status `discovered` in `us/sources.json`, not loaded. The American counterpart to a cleanup registry, from a portal the Atlas already talks to for regulated facilities.
3. **Hamilton Development Applications** — catalogued, not loaded. Shows where redevelopment is being *proposed*, which is the leading indicator the other layers lack.

**Known gap, not a blocker:** Hamilton runs a brownfield programme (ERASE) but `DATA-SOURCES.md`'s catalogue scan found no spatial dataset for it. OSM's `landuse=brownfield` polygons remain the interim proxy on the Canadian side. Per direction: hunt for permit and renewal datasets opportunistically, do not let their absence hold the work up.

### 5.3 New — the curated Reuse layer

**No government publishes this anywhere.** Tri-Main, Silo City, the Cotton Factory appear in no registry as what they actually are: old industrial buildings put back into business use. This layer is hand-maintained and it is the one that carries the argument.

Seed records:

| Site | What it was | What it is |
|---|---|---|
| Tri-Main Center, 2495 Main St, Buffalo | Albert Kahn daylight factory — Ford Model T, Hercules Motors, Bell Aircraft, Trico wipers; 650,000 sq ft, abandoned | Revived early 1990s; small businesses, studios, Buffalo Arts Studio, **Bit Haven** hackerspace (2025) |
| Silo City, Buffalo | Lake & Rail grain elevator, built 1927–30, operating until 2017 | Bought 2006; Lyceum teaching, residencies, workshops, residential from 2025 |
| The Foundry, east Buffalo | — | Community makerspace: metal, wood, tech, fibre labs; workforce training, incubation |
| The Cotton Factory, Hamilton | 1900 Imperial Cotton mill | Studios, workshops, galleries; working 1944 Otis-Fensom freight elevator |
| Central Hamilton Business Park | Otis-Fensom / Studebaker; largest brownfield remediation in Hamilton's history | ~18 serviced lots, remediated ~2018, **still unbuilt** — the counter-example |

Records carry the same normalized schema and provenance block as every other feature. **`source` for a curated record is the published thing that evidences it** — a news article, the operator's own site, a heritage designation — never "Niagara Assembly said so."

**Editorial rule carried from the manifesto spec:** these are evidence the form works, never partners. None has agreed to anything, and the layer must not imply otherwise.

## 6. The contribution pipeline

This is what makes the Atlas Niagara Assembly's rather than a nice map.

The curated Reuse layer is where endorsers contribute: **"Tell us about a building in your town."** It reuses the same mechanism as the other two payloads —

```
form → Sheet → Apps Script → GitHub Issue → `approved` → Action → commit
```

— giving one pipeline and three payloads: **endorsements**, **meetups**, **sites**. The map fills in from the roster, which closes the participation loop the endorsement census was always pointing at.

Submission fields: building name, address or dropped pin, what it was, what it is now (or "empty"), a link that evidences it, and the submitter. Approval is required — a site record is a claim about someone's property.

## 7. Constraints that carry over

These are already documented in the Atlas's own notes and are not negotiable in the refocus.

**ODbL share-alike** (`INTEGRATION.md` §7). OpenStreetMap is the only source spanning the whole map, so it binds any derived layer that mixes sources. Answer the share-alike question deliberately before publishing a derived layer, not after.

**Coverage asymmetry** (`INTEGRATION.md` §5). New York publishes parcels free; Ontario sells them through MPAC. Niagara Region surveys its businesses; Hamilton does not. A viewer panning from Hamilton to Buffalo will read a *publishing* gap as an *industry* gap. The Atlas's own notes call the missing viewport-responsive coverage indicator an **open defect**, not a nice-to-have. The renewal focus reduces the danger but does not remove it.

**The epistemic rules** (`DATA-SOURCES.md`). Never fabricate; a gap is shown as a gap. Never infer a business is operating because an old dataset lists it. Distinguish observation from inference and current from historical. Every layer declares a freshness state. Derived scores are analytical indicators, not economic truth.

**And the defamation guard, which the renewal focus makes sharper:** the map may state that a polygon is tagged brownfield. It may not conclude that a site is vacant today, that a named business is underperforming, or that an owner is neglecting a property. A layer called "Reuse" invites exactly that inference about everything *not* on it — so the absence of a building from the curated layer must never render as a judgment about it.

## 8. Out of scope

- Derived scoring or "opportunity" indices
- Anything implying a site is available, for sale, or that its owner is receptive
- Automated ingestion — `OPERATIONS.md` is deliberately manual, every source having a rate limit, licence or quirk that deserves a human looking at the output
- Extraction of highlights into posts and statement revisions — a later phase (§2)
- UK data (`babbworks/atlas` remains a separate reference implementation)

## 9. Open items

1. Whether the Atlas sits at `niagaraassembly.com/atlas` or its own subdomain.
2. Whether the curated Reuse layer's submission form is a fourth Google Form or a mode of the meetup form.
3. Whether "Reuse" is the right public label — candidates: *Brought back*, *In use again*, *Reopened*.
4. Retirement plan, if any, for the `patonhall/site` copy. Default: leave it entirely alone.
5. The viewport coverage indicator (§7) — carried forward as an open defect from the fork.
