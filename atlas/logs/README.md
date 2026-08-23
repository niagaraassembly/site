# Raw findings log

**Universal rule, set 2026-08-23:** everything found during analysis or coding
is logged here in full — the queries run, the raw numbers, the intermediate
results, the dead ends, the corrections. Not the summary. The summary is what
gets said in conversation; **this is the material the summary was made from**,
kept so narratives can be reconstructed later.

## Why

A summary is lossy by design. Six months from now the question will not be
"what did the atlas conclude" — it will be *"how did we come to believe that,
and what else did we see at the time?"* The intermediate numbers, the query
that returned zero before it was normalized, the count that looked wrong and
turned out to be right — those are the raw material of every later narrative,
and they are gone unless written down when observed.

## Rules

1. **Append only.** Never edit a past entry. Corrections are new entries that
   reference the old one.
2. **Raw before conclusions.** Record the actual command, the actual output,
   the actual counts. Interpretation comes after, clearly marked.
3. **Log the failures.** A query that returned zero, an endpoint that 403'd, an
   assumption that proved wrong — these carry more narrative weight than the
   successes and are the first thing lost.
4. **Date and time every entry.** Sequence is part of the story.
5. **Name the file that changed**, so the log and the repo can be read together.
6. **State the jurisdiction** any finding is bounded by — see
   [../GLOSSARY.md](../GLOSSARY.md).

## Files

`YYYY-MM-DD.md` — one file per day, entries appended in order.
