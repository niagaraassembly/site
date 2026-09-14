# Assessment roadmap — Greater Niagara Industrial Atlas

Short hybrid plan for Stages **0–10**. Hybrid means: reuse what the UK and
Niagara experiments already proved, discard what they did not, and insert
gates (liability, monetization) before deep modelling. This is a sequence of
*assessment* work, not a build schedule for the shipping map.

Companion to [AUDIT-LEDGER.md](AUDIT-LEDGER.md) (where artefacts are tagged),
[DECISIONS.md](DECISIONS.md) (standing decisions; starts with D-A1),
[INGESTION-LEDGER.md](INGESTION-LEDGER.md), and [BACKLOG.md](BACKLOG.md).

**Rule of thumb:** do not start a later stage's deep work until the previous
stage's *gate* is written down — a filled ledger section, a decision entry, or
an explicit deferral with a reason.

---

## Stage map

| Stage | Name | Outcome |
|---:|---|---|
| **0** | Scaffolding | This roadmap, the audit ledger template, and DECISIONS.md exist on a branch / PR (NIA-7) |
| **1** | Re-tag priors | Every material UK and Niagara artefact has an AUDIT-LEDGER row (Source + Status) |
| **2** | Trimmed comparison + unclaimed wishlist | Side-by-side keep/adapt/drop; wishlist neither prior claimed |
| **3** | Liability gate | Publication risk classes named; unsafe claim types blocked or redesigned before build |
| **4** | Asset extraction | Reusable code, schemas, copy, and data contracts lifted from priors into a clean inventory |
| **5** | Monetization before entity model | Who pays, for what artefact, at what freshness — decided enough to constrain the model |
| **6** | Geography | Study area vs peninsula vs jurisdictions fixed in glossary terms; coverage claims match data |
| **7** | Entity model | Units, organisations, observations, inferences — shaped by Stages 3 and 5, not before |
| **8** | Source strategy | What to fetch, license, cache, ship, link, or refuse; feeds ingestion ledger practice |
| **9** | Thin vertical slice | One end-to-end path (ingest → normalize → one honest map claim) that respects the gates |
| **10** | Close assessment | Open questions listed; build backlog handed off; abandoned paths remain visible |

---

## Stage notes

### 0 — Scaffolding

Land empty structure only. No tagging theatre: Stage 1 owns the first real
rows. Seed [DECISIONS.md](DECISIONS.md) with D-A1 (priors are research
experiments, not v1→v2).

### 1 — Re-tag priors

Walk UK materials and `atlas/` (docs, scripts, live layers, designed backlog).
Assign Implemented / Generated / Cached / Designed / Proposed / Abandoned.
Citation required. Prefer thin rows.

### 2 — Trimmed comparison + unclaimed wishlist

Compare UK vs Niagara on scope, entity assumptions, publication model, and
ops. Record only decisions that change what we do next. Add wishlist items
that are *unclaimed* by both — gaps, not duplicates of BACKLOG Tier A.

### 3 — Liability gate

Before richer claims: named-business operating status, departures, scores
presented as fact, and anything a reader could treat as defamation or advice.
Align with the existing publication / defamation guard thinking already in the
Niagara docs; do not invent a second doctrine. Gate output is a short allow /
deny / redesign list cited from the audit ledger.

### 4 — Asset extraction

Copy or carve reusable pieces into an explicit inventory (paths + licences +
what must be rewritten). Extraction is not adoption — adoption waits on 5–9.

### 5 — Monetization before entity model

**Order is intentional.** Entity models bake in who the product is for. Settle
audience and revenue (or deliberate non-revenue) constraints first, even if
only as provisional D-A# decisions. Revisiting an entity model is cheaper than
shipping the wrong one.

### 6 — Geography

Lock vocabulary: Niagara Region ≠ Peninsula ≠ study area ([GLOSSARY.md](GLOSSARY.md)).
Decide what Greater Niagara means for *this* product and what data must exist
before a coverage claim is allowed.

### 7 — Entity model

Only after 3 and 5. Distinguish observation from inference; current from
historical; unit from organisation. Prefer the smallest model that supports
the Stage 9 slice.

### 8 — Source strategy

Publisher roster, licence posture, refresh cadence, ship vs derive vs link
(see TECHNOLOGY-DECISIONS disposition thinking). Write strategy; let
INGESTION-LEDGER remain the operational record.

### 9 — Thin vertical slice

One path that proves the gates: real source → normalized feature with
provenance → one map or dossier claim that would survive the liability gate.
No parallel feature build-out.

### 10 — Close assessment

Hand a build backlog to implementation. Keep Abandoned and deferred items in
the audit ledger so the next agent does not re-litigate them blind.

---

## Current position

| | |
|---|---|
| Active stage | **0 — Scaffolding** |
| Linear | **NIA-7** |
| Blocked on | Nothing for Stage 0; Stage 1 needs access to UK prior materials and a pass over `atlas/` |

---

## Amendment log

Newest first.

- **2026-09-14** — Stages 0–10 written as the hybrid assessment plan (NIA-7).
