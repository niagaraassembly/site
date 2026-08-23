# Niagara Assembly — working rules

## Raw logging is mandatory

**Set 2026-08-23. Applies to all analysis and all coding, always.**

Everything found is logged raw in `atlas/logs/YYYY-MM-DD.md` — the queries run,
the actual numbers, the intermediate results, the dead ends, the corrections.
**Not the summary.** The summary is what goes in conversation; the log is the
material the summary was made from, kept so narratives can be reconstructed
later.

- **Append only.** Corrections are new entries referencing the old, never edits.
- **Raw before conclusions.** Actual command, actual output, actual counts.
  Interpretation after, marked **Interpretation**.
- **Log the failures.** A query that returned zero before normalization, an
  endpoint that 403'd, an assumption that proved wrong — these carry more
  narrative weight than the successes and are the first thing lost.
- **Date every entry**; sequence is part of the story.
- **Name the files that changed.**

See `atlas/logs/README.md`.

## Say which jurisdiction

`atlas/GLOSSARY.md` is binding. In short:

- **Niagara Region** — an official upper-tier municipality of twelve lower-tier
  municipalities, and a data publisher. **Never** a synonym for the area.
- **Niagara Peninsula** — the geography. Includes Niagara Region, Hamilton,
  Haldimand County, extending west to **Brantford**. Exceeds our current data.
- **Study area** — what we actually hold data for. Use this for coverage claims.

A finding bounded by a jurisdiction must say which, and whether the bound is
the data's or the world's.

## Evidence rules

Carried from `atlas/DATA-SOURCES.md` and the 2026-08-19 atlas spec:

- Never fabricate. A gap is shown as a gap.
- Every count, field name and licence is **observed by live query on a stated
  date**, never assumed.
- Negative findings and dead ends are recorded so they are not re-attempted.
  "Not probed" is written down rather than silently omitted.
- Distinguish observation from inference, and current from historical.
- Derived scores are analytical indicators, not economic truth.
- The defamation guard: the map may report what a record says. It may not
  conclude that a site is vacant, that a named business is underperforming, or
  that an owner is neglecting a property.
