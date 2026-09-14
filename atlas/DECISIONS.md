# Atlas assessment — decisions

Standing product and assessment decisions for the **Greater Niagara Industrial
Atlas** audit (Stages 0–10). **Append, don't rewrite** — a superseded decision
stays visible with the date and reason it changed, so an incoming developer or
agent can see how we got here rather than only where we landed.

Companion to [ASSESSMENT-ROADMAP.md](ASSESSMENT-ROADMAP.md) (stage plan),
[AUDIT-LEDGER.md](AUDIT-LEDGER.md) (artefact dispositions), and
[TECHNOLOGY-DECISIONS.md](TECHNOLOGY-DECISIONS.md) (tooling — keep that log for
geometry, fetch, basemap and similar; put *product / scope / lineage*
decisions here).

**Format.** Each decision: the question, the options with their real
trade-offs, what was chosen, and what would change the answer. Numbered
`D-A#` so they do not collide with `D-#` in TECHNOLOGY-DECISIONS.md.

---

## D-A1 · Prior atlases are research experiments, not a product lineage — 2026-09-14

**Question.** How should the UK industrial-atlas work and the existing
Hamilton–Niagara atlas in this repo relate to the Greater Niagara Industrial
Atlas under assessment?

| Option | Makeup | Strengths | Weaknesses |
|---|---|---|---|
| **Research experiments** ✅ | Treat UK and Niagara as independent prior experiments; mine them for evidence, patterns, and reusable assets; do not inherit their product identity | Honest about discontinuity; frees the assessment to drop, reframe, or re-implement without "v2" debt; matches how the work was actually done | Requires explicit re-tagging (Stage 1) so nothing useful is lost by accident |
| v1 → v2 extension | Niagara (or UK) is version one; Greater Niagara is the next release of the same product | Familiar narrative; preserves brand continuity | Forces inheritance of scope, entity model, liability posture, and publication choices that have not passed the assessment gates; blurs research findings with product commitments |
| Dual-track merge | Keep both priors as live products and merge features | Retains sunk work visibly | Doubles maintenance; implies two audiences and two truth models before monetization and liability are settled |

**Chosen: research experiments, not a v1→v2 extension.**

UK and Niagara are **inputs to the audit**, recorded in
[AUDIT-LEDGER.md](AUDIT-LEDGER.md) with Source `UK` or `Niagara`. Reusable
pieces move forward as **New** (or re-Implemented) only after they clear the
relevant later stages — especially the liability gate, monetization-before-
entity-model ordering, and the thin vertical slice. Nothing is "already the
product" merely because it exists in `atlas/` or in a prior UK tree.

**Why not v1→v2**, despite the temptation: the existing Niagara atlas is a
reconnaissance-and-normalization body of work with known sharp edges (for
example the departures false-positive class recorded in BACKLOG.md). Calling
the next effort a version bump would smuggle those edges into a product
promise. The UK work is likewise an experiment in another geography and
publishing context. Continuity of *learning* is required; continuity of
*product lineage* is not.

**What would change this:** a deliberate, written product decision — after
Stages 3–5 at minimum — that a named prior *is* the shipping baseline. That
decision would be a new `D-A#` entry, not a quiet edit to this one.

**Linear:** NIA-7 (Stage 0 scaffolding).

---

## Amendment log

Newest first.

- **2026-09-14** — D-A1 seeded with Stage 0 (NIA-7).
