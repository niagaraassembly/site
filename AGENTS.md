# Agent operating contract — Industrial Atlas

This file is the **institutional contract** for every coding agent (GitHub Copilot, Cursor, Kiro, Grok Bot helpers, humans pairing with agents).

If you were assigned a Linear issue, **read this file first**, then the issue, then linked docs.

## Authority

| System | Owns |
|--------|------|
| **Linear** (`niagaraassembly` → project **Industrial Atlas**) | Backlog, priority, milestones, status, acceptance context |
| **GitHub** (this repo and linked prior-art repos) | Code, branches, PRs, CI |
| **This file + `atlas/DECISIONS.md` + `atlas/AUDIT-LEDGER.md`** | Methodology and durable decisions |

- Do **not** create GitHub Issues for ordinary Atlas work.
- Do **not** invent a parallel backlog in chat, PR titles, or local todos.
- Linear issue ID (e.g. `NIA-12`) must appear in the PR body.

## Who does what

| Actor | Lane |
|-------|------|
| Human (Morgen) | Product decisions, merges, secrets, architecture go/no-go |
| Grok Bot — Chief of Staff | Linear hygiene, routing, escalations, synthesis |
| Cursor | Interactive exploration / hard multi-file work with human in the loop |
| **GitHub Copilot coding agent** | Async implementation: Linear issue → draft PR |
| Kiro (when used) | Specialized process agents (architect / test / review) |
| Review specialists | Critique vs Linear acceptance — not a fourth implementer |

**Copilot:** you are a background implementer. You do not own the backlog or product definition.

## When you pick up a Linear issue

1. Confirm the issue has label **`agent-ready`**. If missing, comment on Linear and stop — ask Chief of Staff / Morgen to complete the agent packet.
2. Note labels `agent:copilot` | `agent:cursor` | `agent:kiro` — only implement if you are that agent (or the issue explicitly assigns you).
3. Read the issue section **Agent packet** (required fields below).
4. Read linked paths (`atlas/ASSESSMENT-ROADMAP.md`, inventories, decisions).
5. Implement **only** the stated outcome. No drive-by product redesign.
6. Open a draft PR → link Linear ID → comment progress/blockers on the Linear issue.
7. Leave Linear status accurate (In Progress / In Review).

### Required **Agent packet** on every implementable issue

```markdown
## Agent packet
- **Assignee agent:** Copilot | Cursor | Kiro | human
- **Repo:** `niagaraassembly/site` (paths: …)
- **Outcome:** …
- **Out of scope:** …
- **Acceptance checks:** …
- **Prior-art posture:** evidence-only | allowed to modify | docs-only
- **Links:** Linear milestone, AUDIT-LEDGER / DECISIONS / inventory paths
```

If any field is missing or contradictory, **do not guess** — comment on Linear and wait.

## Prior-art posture (M0 and generally)

| Repo | Default posture |
|------|-----------------|
| `babbworks/atlas` | Research evidence — do not treat as v1 to extend |
| `niagaraassembly/site` `atlas/` | Research evidence + docs home; documentary PRs OK when issues ask |
| Future third-gen app repo | Implementation target only after Stages 6–10 specify it |

Prior-art claim tags: `Implemented | Generated | Cached | Designed | Proposed | Abandoned`  
Cite paths (and lines when useful) in the audit ledger style.

## Current program phase

Milestone **M0 — Prior-art assessment** (see `atlas/ASSESSMENT-ROADMAP.md`).  
Prefer documentary / inventory / scaffold PRs. Do not start a greenfield commercial atlas app unless a later-milestone Linear issue explicitly says so.

## Security

- Never commit secrets, tokens, or `.env` files.
- If you find a committed secret: report **path + type only** on Linear; never paste the value; human revokes.
- Respect licensing constraints (e.g. OSM ODbL share-alike) called out in issues/docs.

## Done checklist

- [ ] Linear issue ID in PR
- [ ] Scope ≤ Agent packet
- [ ] No secrets in diff
- [ ] Blockers written to Linear (not only agent logs)
- [ ] Human can merge or reject with clear evidence
