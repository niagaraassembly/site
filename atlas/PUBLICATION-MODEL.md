# Atlas — publication model and audiences

How the work reaches people, and who it is for. Recorded 2026-08-23 as a
framing to build toward; **the detail is expected to change** and this document
is the place that records it changing.

Companion to the foundational documents it describes — see §2.

---

## 1. Why this is written down

Everything built so far is *apparatus*: reconnaissance, ledgers, schemas,
decision records, an engine design. Apparatus is not an outcome. The outcome
this project is after is **social and political** — that people with different
professional stakes in the region's industrial land can look at the same
evidence, recognise their own concerns in it, and act.

That is a publishing problem as much as a data problem, and it is easy to lose
while doing the data work. Hence this file.

---

## 2. Three surfaces

### 2.1 The Atlas application

The main presentation: a high-performing, layer-rich map. This is what most
people will ever see.

**Pending functionality**, deliberately local-first — no accounts, no server,
no collection of anyone's activity:

- **Site postcards** — export a site as a shareable card
- **Per-site notes**, saved in the browser
- **Email / share** a site out

These are not speculative. The UK reference implementation
(`babbworks/atlas`) already demonstrates all three: `html2canvas` PNG share
cards in square and 16:9 with a generated SVG map background, and
`property.html`'s notes module with a save-as-standalone-HTML function. That
prior art is why they are listed as pending rather than as ideas.

Local-first matters here for the same reason the tiering decision does: a
person making private notes about industrial property should not be creating a
record on someone else's server.

### 2.2 Foundational documents — the sources of truth

Steward-edited. Precise, dated, observed-not-assumed. These are the documents
this project has been producing, and they are written for developers, future
agents, and anyone auditing a claim.

| Document | Holds |
|---|---|
| `DATA-SOURCES.md` · `RECON-2026-08-22.md` | source reconnaissance, verified against live endpoints |
| `CANDIDATES.md` · `CANDIDATES-HAMILTON.md` | the numbered dataset menus |
| `SCHEMAS-HAMILTON.md` | observed field-level schemas |
| `INGESTION-LEDGER.md` · `sources/manifest*.json` | what is held, verified when, pulled when |
| `BACKLOG.md` | everything found and not yet loaded; live defects |
| `ENVIRONMENT.md` · `TECHNOLOGY-DECISIONS.md` | what we build with and why |
| `docs/superpowers/specs/…-atlas-engine-design.md` | the analysis engine |

**House rule, already in force:** every count, field name and licence is
observed by live query on a stated date. Negative findings and dead ends are
recorded so they are not re-attempted. "Not probed" is written down rather than
silently omitted.

### 2.3 Constituency pages — one level up

Public-facing pages that *reference* the foundational documents and the data,
bundling the work into a few solid areas so that a person with a particular
professional or political interest has somewhere to connect.

Provisional groupings — **to be fine-tuned:**

| Area | Speaks to | Draws on |
|---|---|---|
| **Cartography** | cartographers, designers, the general public | basemaps, terrain, symbolisation, simplification, the visual system (D-10 · D-11 · D-12 · D-5 · D-6) |
| **Business statistics** | economic development, business associations, researchers | NEI, licence registers, employment bands and their calibration, sector mix, under-occupancy |
| **Land use and transportation planning** | planners, councillors, transport and logistics | zoning, Official Plan designations, constraints, servicing capacity, truck routes, AADT, rail, transit access |

These are entry points, not silos. A single site record touches all three.

**Their character — recorded 2026-08-23.** These pages are *not* decision
documents and should not read like the foundational ones. Each is three things
at once:

- **attestation to approach** — here is how we did this, and why it can be trusted
- **appeal for participation** — here is where someone with this expertise comes in
- **casual celebration** — here is what has been achieved so far, said lightly

**Form: tight block-based narrative with anchored links into the source
documents.** A block makes one point and links to the evidence for it; the
reader who wants depth follows the anchor, and the reader who does not is not
made to wade. Cartography needs no heavy decision-making to earn its page — it
is about visual approach, shown.

---

## 3. Cartography has a distinct standing

**Cartography is a different profession from the data and statistical work
this project has mostly been doing**, and it is the aspect the public most
readily appreciates. A well-made map is how most people will judge whether this
is serious.

Two consequences:

**It deserves its own decision register.** Cartographic decisions currently sit
in `TECHNOLOGY-DECISIONS.md` interleaved with JSON parsers and shapefile
readers (D-5, D-6, D-10, D-11, D-12 are cartographic; D-1, D-7, D-8 are not). A
cartographer arriving here should not have to read a decision about `orjson` to
find the one about hillshade resolution. **Proposed: extract the cartographic
decisions into `CARTOGRAPHY.md`**, cross-referenced from
`TECHNOLOGY-DECISIONS.md`, when there are enough of them to justify the split.
Not done yet — recorded so it is a deliberate move when it happens.

**It is a place to invite expertise we do not have.** The weight-table
contribution path in the engine spec (§7) is designed for analysts. The
cartographic equivalent — palettes, symbolisation, label hierarchy, basemap
choice — is a distinct invitation to a distinct profession, and probably a more
approachable one.

---

## 4. What this changes now

Nothing yet, deliberately. No page is built, no structure is fixed. What it
does is set a test that later work has to pass:

> Does a person who cares about *one* of these areas find a way in, and find
> the evidence behind what they are shown?

The foundational documents already answer the second half. The constituency
pages are how the first half gets answered.

---

## 5. Open

1. Whether the three areas in §2.3 are the right cut, and whether there are
   more — heritage, environment and labour are all candidates.
2. Whether constituency pages live inside the Atlas application, alongside it
   on the main site, or as a third thing.
3. When `CARTOGRAPHY.md` splits out of `TECHNOLOGY-DECISIONS.md` (§3).
4. How the local-first features (§2.1) handle a person wanting to *share* a
   note or a postcard — the moment it leaves the browser it stops being local,
   and that boundary needs a deliberate answer.
