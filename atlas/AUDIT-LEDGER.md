# Audit ledger — Greater Niagara Industrial Atlas

**The running record of what prior work exists, what it is worth, and what
disposition it has under the Stage 0–10 assessment.** One row per auditable
artefact (document, script, dataset, design note, live claim). Append; do not
rewrite a closed row — mark it Abandoned or supersede it with a new row and a
cross-reference.

Companion to [ASSESSMENT-ROADMAP.md](ASSESSMENT-ROADMAP.md) (the stage plan),
[DECISIONS.md](DECISIONS.md) (standing product decisions from this audit),
[INGESTION-LEDGER.md](INGESTION-LEDGER.md) (what is held locally and when it was
pulled), and [TECHNOLOGY-DECISIONS.md](TECHNOLOGY-DECISIONS.md) (tooling
choices — a different log; do not merge the two).

This ledger is **hand-maintained** during the assessment. It is not regenerated
by a script. The ingestion ledger remains the machine twin for fetch state.

---

## Taxonomy

Every row carries exactly one status from this set:

| Status | Meaning |
|---|---|
| **Implemented** | Shipped and live (or build-side and currently used) |
| **Generated** | Produced by a pipeline or script; output exists and is checkable |
| **Cached** | Held locally (usually gitignored); not yet ingested or rendered |
| **Designed** | Specified in a doc or decision; not yet built |
| **Proposed** | On the table; no adoption decision yet |
| **Abandoned** | Explicitly withdrawn — keep the row so the gap stays visible |

Statuses are mutually exclusive. A Cached layer that later ships becomes
Implemented (new row or amended status with a dated note). Abandoned is for
things that looked useful and were rejected with a reason, not for things
never started.

---

## Columns

| Column | What it holds |
|---|---|
| **ID** | Stable short id within this ledger (`A-###`). Quote it when referring to a row from decisions or the roadmap. |
| **Artefact** | Name or path — document, script, layer, design note |
| **Source** | **UK** · **Niagara** · **New** — which prior body the artefact comes from, or whether it is original to this assessment |
| **Status** | One of the six taxonomy values above |
| **Citation** | Where to find it (path, URL, commit, issue). Prefer repo-relative paths. |
| **Notes** | One or two lines: what it actually is, what to do next, or why Abandoned |

**Source values:**

- **UK** — prior UK industrial-atlas experiment (research antecedent, not a
  product lineage; see [DECISIONS.md](DECISIONS.md) D-A1).
- **Niagara** — work already in this repo under `atlas/` (Hamilton–Niagara
  atlas, recon, ledgers, scripts, live layers).
- **New** — introduced by this assessment, or required and not yet present in
  either prior body.

---

## How to use

1. **Stage 0** lands this template and the empty Stage 1 / Stage 2 tables.
2. **Stage 1** (re-tag priors) fills rows by walking UK and Niagara artefacts
   and assigning Source + Status. Prefer many thin rows over one vague row.
3. **Stage 2** (trimmed comparison + unclaimed wishlist) adds comparison
   outcomes and wishlist items that neither prior claimed.
4. Later stages amend Status and Notes; they do not delete rows.
5. When a decision depends on an artefact, cite its **ID** from
   [DECISIONS.md](DECISIONS.md).
6. Liability-sensitive claims (named business status, departures, scoring) get
   an explicit Notes flag until the Stage 3 liability gate clears them.

**Do not** treat this ledger as a substitute for [INGESTION-LEDGER.md](INGESTION-LEDGER.md).
Fetch/verify/pull facts stay there. This file answers *"what prior work exists
and what is its disposition under the audit?"*

---

## Stage 0 — scaffolding

| | |
|---|---|
| Opened | **2026-09-14** |
| Linear | **NIA-7** |
| Branch intent | `nia-7-audit-ledger` |
| Status of this file | Template only — no audit rows yet |

---

## Stage 1 — re-tag priors

Empty until Stage 1 runs. Expected fill: UK artefacts, Niagara `atlas/`
documents and scripts, live layers, and designed-but-deferred items from
[BACKLOG.md](BACKLOG.md).

| ID | Artefact | Source | Status | Citation | Notes |
|---|---|---|---|---|---|
| | | | | | |

---

## Stage 2 — trimmed comparison + unclaimed wishlist

Empty until Stage 2 runs. Expected fill: side-by-side outcomes (keep / adapt /
drop) and wishlist items claimed by neither UK nor Niagara.

| ID | Artefact | Source | Status | Citation | Notes |
|---|---|---|---|---|---|
| | | | | | |

---

## Amendment log

Newest first.

- **2026-09-14** — Stage 0 scaffold opened (NIA-7). Taxonomy, columns, and
  empty Stage 1 / Stage 2 tables only. No prior artefacts tagged yet.

---

## Rules for amending this file

1. **Append or amend in place with a dated note** — do not silently rewrite
   history. Abandoned rows stay listed.
2. **One row per artefact**, not per wish. A bundle of three scripts is three
   rows if they can be dispositioned separately.
3. **Status is observed**, not aspirational. Proposed means proposed; Designed
   means a written design exists.
4. **Citation is mandatory.** A row without a findable pointer is not auditable.
5. **Source is UK, Niagara, or New** — never a free-text publisher name (those
   belong in the ingestion ledger).
6. **Cross-link decisions.** If [DECISIONS.md](DECISIONS.md) depends on a row,
   both sides cite each other.
