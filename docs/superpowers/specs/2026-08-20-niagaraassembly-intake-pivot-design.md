# Niagara Assembly — intake pivot

**Date:** 2026-08-20
**Status:** design, approved in chat pending spec review
**Supersedes:** the endorsement and meetup flows in
`2026-08-19-niagaraassembly-manifesto-site-design.md`

---

## 1. What changes

The site stops being a manifesto with two forms attached and becomes a
one-page front door with an intake system behind it. The manifesto prose
moves to `extra-docs/statement.md` — kept, not published as a page.

Eight stated intake needs collapse into **three pipelines**, sorted by what
happens to the data rather than by topic:

| # | Pipeline | Approval gate | Public output |
|---|---|---|---|
| ① | **Join** — mailing list + membership | none | none |
| ② | **Board** — six kinds of public post | `approved` label | `data/board.json` |
| ③ | **Register** — expert, open source | `approved` (open source only) | none |

Each pipeline is one Google Form, one bound Sheet, one Apps Script. Three
setup runbooks, not eight.

The transport is unchanged and already built:

```text
browser form -> Google Form -> response Sheet -> Apps Script -> GitHub Issue + Kit
approved label -> GitHub Action -> scripts/approve_request.py -> data/board.json
approved label -> GitHub Action -> org invitation (open source only)
```

Target repo is `niagaraassembly/site` — the value already hardcoded as
`var REPO` in both existing `.gs` files.

---

## 2. Pipeline ① — Join

Homepage form. Name, email, and a membership level.

**Levels:** `List`, `Regional`, `Company`, `Champion`.

`List` is the default and means mailing list only. The other three are
*expressions of interest*: nobody is charged and no membership is conferred
by the form. The Issue exists so an admin follows up. This is the same
shape as `site/google-apps-script/homepage-signup.gs`, which is the file to
port.

**Kit tags** (must exist before the script runs — `runSelfTest` fails
otherwise, deliberately):

| Level | Tag |
|---|---|
| List | `na-list` |
| Regional | `na-member-regional` |
| Company | `na-member-company` |
| Champion | `na-member-champion` |

Every submitter is added to the Kit double-opt-in form regardless of level,
so everyone lands on the mailing list. Level tags are additive on top.

**Google Form questions** — exact titles, all matched by `pick()`:

| Question title | Type | Required in Google |
|---|---|---|
| `Name` | Short answer | yes |
| `Email` | Short answer | yes |
| `Level` | Multiple choice (`List`/`Regional`/`Company`/`Champion`) | yes |

Required is safe here because every field applies to every submission.

**Issue:** title `Join: <name> (<level>)`, labels `join`. No `<!--DATA-->`
block — nothing about a member is ever written to a public file, so there
is nothing for the Action to consume. The admin closes it by hand.

**On the page:** a `List`-only submission gets a plain confirmation. A
`Regional`/`Company`/`Champion` submission gets a confirmation that says
someone will be in touch — it must not imply membership has been granted.

---

## 3. Pipeline ② — Board

One form, six post kinds, one public JSON file, one approval gate.

### 3.1 Kinds and required fields

Field names are the stable HTML `name` attributes. Visible labels are
rewritten per kind by the page; the names never change.

| Kind | Required | Optional |
|---|---|---|
| `standup` | title, when, where, contact | description, link |
| `talk` | title, presenter, when, where, contact | description, link |
| `demo` | title, presenter, when, where, contact | description, link |
| `space` | where, description, contact | link |
| `news` | title, link, description | — |
| `idea` | title, description | link, contact |

`name` and `email` are required on all six and are **never public**.

Per-kind label rewriting, so a generic field set reads naturally:

| Kind | `title` renders as | `where` renders as |
|---|---|---|
| `standup` | What's the stand-up about? | Where |
| `talk` | Talk title | Venue |
| `demo` | What are you demoing? | Venue |
| `space` | *(hidden)* | Where the space is |
| `news` | Headline | *(hidden)* |
| `idea` | Your idea, in a line | *(hidden)* |

### 3.2 The Google-required trap

**No question on the Board form may be marked required in Google Forms.**
A `news` post has no `when`; a required `When` question rejects it. Google
reports this as a generic failure and `submit.js` posts `no-cors`, so the
page cannot see the rejection — the submission simply vanishes.

All Board validation therefore lives in `validateBoard(values)` in
`assets/js/submit.js`, keyed off `values.type`, and is re-checked
server-side in `REQUIRED` in `scripts/approve_request.py`. Two gates, both
of which can see their own failure.

### 3.3 Google Form questions

| Question title | Type |
|---|---|
| `Type` | Multiple choice: `standup`/`talk`/`demo`/`space`/`news`/`idea` |
| `Name` | Short answer |
| `Email` | Short answer |
| `Title` | Short answer |
| `Presenter` | Short answer |
| `When` | Short answer |
| `Where` | Short answer |
| `Description` | Paragraph |
| `Link` | Short answer |
| `Contact` | Short answer |

### 3.4 Issue and approval

`board.gs` writes an Issue titled `<Type>: <Title or Where>`, labelled
`board`, carrying a `<!--DATA {...} DATA-->` block with `kind` set to the
type and **no `email` and no `name` key present at all**. `runSelfTest`
asserts this, as it does today.

`scripts/approve_request.py` gains six entries in each of its three dicts.
All six point at the same file and id prefix, so ids run in one sequence
across the whole board:

```python
TARGET = {k: ("data/board.json", "b")
          for k in ("standup", "talk", "demo", "space", "news", "idea")}
```

`PUBLIC` lists exactly the required plus optional fields from §3.1, plus
`id`, `type`, and `date`. `name` and `email` appear in no entry.

The `endorsement` and `meetup` entries are removed from all three dicts.
`data/endorsements.json` and `data/meetups.json` are deleted; both are
currently `[]`, so nothing is lost.

`MAX_COMMENT` is renamed `MAX_TEXT` (2500) and applies to `description`.

### 3.5 Rendering

`board.html` reads `data/board.json` and renders cards grouped by type,
newest first, every value escaped through `assets/js/escape.js`. The
`approved` label is an editorial gate, not a security control — that has
not changed.

`assets/js/meetups.js` and `assets/js/endorsements.js` are replaced by
`assets/js/board.js`. `escape.js` and `submit.js` survive. `assets/js/faces.js` is deleted: it
switched between the Statement and Endorsements faces of a single page, and
the board is now its own page reached by a link.

---

## 4. Pipeline ③ — Register

One form, two kinds, one script. Nothing here becomes public.

### 4.1 Expert

Someone offering to lead training or workshops in the region.

Fields: `Name`, `Email`, `Expertise`, `Credentials`, `Region`,
`Availability`.

Kit tag `na-expert`. Issue titled `Expert: <name> — <expertise>`, label
`expert`. No `<!--DATA-->` block. An admin follows up.

**This is not a public directory.** If it should become one later, it
becomes a seventh Board type with its own `PUBLIC` entry; it is not a
change to this pipeline.

### 4.2 Open source

Someone offering to help build the software.

Fields: `Name`, `Email`, `GitHub username`, `Interest`.

Kit tag `na-opensource`. Issue titled `Open source: <github username>`,
label `opensource`, carrying a `<!--DATA-->` block whose only key is
`github_username` — enough for the Action, nothing more.

On `approved`, the Action invites them to the `niagaraassembly` org:

```bash
gh api --method PUT "orgs/niagaraassembly/memberships/${USERNAME}" -f role=member
```

`PUT /orgs/{org}/memberships/{username}` is used rather than
`POST /orgs/{org}/invitations` because it takes a username directly; the
invitations endpoint wants a numeric user id or an email address.

**The default `GITHUB_TOKEN` in Actions cannot invite org members.** This
step needs a separate fine-grained PAT with organization permission
`Members: Read and write`, created by an org owner, stored as the repo
secret `ORG_INVITE_TOKEN`. Using the workflow's own token here fails with
403 at the moment a real person is waiting on an invitation.

The username is validated against `^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$`
before it reaches the shell.

---

## 5. The workflow

`.github/workflows/approve-request.yml` keeps its `issues: [labeled]`
trigger, its `write-data` concurrency group, and its
`cancel-in-progress: false` — cancelling mid-write drops the record being
committed. It gains a second job:

| Job | Runs when | Does |
|---|---|---|
| `write` | label `approved` **and** issue has label `board` | `approve_request.py`, commits `data/board.json` |
| `invite` | label `approved` **and** issue has label `opensource` | the `gh api` call above |

The two jobs are independent and do not share the concurrency group —
only `write` touches the repo.

Both jobs comment back on the issue with what happened, success or
failure. A silent Action is the same failure mode as a silent form.

---

## 6. Aesthetic

Reference: plain, near-unstyled document. Left-aligned single column,
generous line height, no colour beyond ink and paper, no imagery, one
hand-drawn bounding box around the whole page.

**Rough.js.** `site/assets/js/sketch.js` ports across unchanged in
substance. Its two load-bearing properties stay: seeds derive from element
index so borders do not twitch on resize, and the `.sketched` class lands
on `<html>` only after a successful draw, so a 404 or a throw degrades to
clean CSS borders rather than to no borders.

Refinements for this site: `roughness` drops from 0.9 to about 0.7 and
`bowing` from 0.6 to about 0.45 — the current values read slightly loose
against plain text at this scale. One `data-sketch="frame"` on the page
wrapper; `data-sketch="box"` on form fieldsets and board cards.

**Type.** The mix is the thing to get right:

| Where | Face |
|---|---|
| Body prose, headings | System sans stack — the reference's neutrality |
| Buttons, form labels, board card headers | A hand face |
| Data, dates, IDs | System monospace |

Prose stays serious; the drawn frame and the drawn type agree with each
other on the chrome. The hand face is a single open question — Comic Sans
against a cleaner hand face such as Caveat or Patrick Hand — to be settled
by looking at both in place, not in the abstract.

---

## 7. File plan

**New**

```
board.html
assets/js/board.js
google-apps-script/join.gs
google-apps-script/board.gs
google-apps-script/register.gs
data/board.json                     (seeded [])
extra-docs/statement.md
```

**Modified**

```
index.html                          one-pager; three forms
assets/js/submit.js                 validateJoin, validateBoard, validateRegister
assets/css/site.css                 plain-document pass
assets/js/sketch.js                 ported from site/, retuned
scripts/approve_request.py          six board kinds; endorsement/meetup out
.github/workflows/approve-request.yml   second job
docs/SETUP.md                       rewritten for three pipelines
README.md                           data flow diagram
```

**Deleted**

```
assets/js/meetups.js
assets/js/endorsements.js
assets/js/faces.js
google-apps-script/endorse.gs
google-apps-script/meetup.gs
data/meetups.json
data/endorsements.json
tests/meetups.test.mjs
tests/endorsements.test.mjs
tests/faces.test.mjs
```

---

## 8. Testing

Existing harness stands: `node --test tests/*.test.mjs` and
`python3 -m unittest discover -s tests`.

| Test | Asserts |
|---|---|
| `tests/submit.test.mjs` | `validateBoard` enforces §3.1 per type — `news` without `when` passes, `standup` without `when` fails |
| `tests/board.test.mjs` | `board.js` escapes every rendered value; groups and orders correctly |
| `tests/escape.test.mjs` | unchanged |
| `tests/test_approve_request.py` | each of six types writes only its `PUBLIC` fields; a record carrying `name` or `email` writes neither; ids stay sequential across mixed types; unknown `kind` is rejected |

Each `.gs` keeps a `runSelfTest` verifying: Script Properties present, data
block parses, Kit tags exist, and no private field can reach the issue body.
For `register.gs` this additionally asserts the open-source data block
carries `github_username` **and nothing else**.

---

## 9. Setup, in order

Work top to bottom; each step depends on the last.

1. **GitHub** — create org `niagaraassembly`, repo `site`, public.
   Pages: default branch, root. Labels: `approved`, `board`, `join`,
   `expert`, `opensource`.
2. **Tokens** — fine-grained PAT with `Issues: write` on the repo (this is
   `GITHUB_TOKEN` in Apps Script, never in the repo). Second PAT with org
   `Members: Read and write`, stored as repo secret `ORG_INVITE_TOKEN`.
3. **Kit** — API key, double-opt-in form id, and seven tags spelled
   exactly: `na-list`, `na-member-regional`, `na-member-company`,
   `na-member-champion`, `na-board`, `na-expert`, `na-opensource`.
4. **Google Forms** — three forms per §2, §3.3, §4. Board form: no question
   required. Link each to a Sheet.
5. **Wire the page** — replace `*_ACTION` and `*_MAP` placeholders in
   `index.html` with real form URLs and `entry.*` ids, read from
   `FB_PUBLIC_LOAD_DATA_` in the live form's source. Not from a pre-filled
   link — that method yields ids that look right and silently drop values.
6. **Apps Script** — paste each `.gs` into its Sheet, set the three Script
   Properties, install `onFormSubmit` as an **installable** trigger, run
   `runSelfTest`.
7. **DNS** — `niagaraassembly.com` at GitHub Pages. `CNAME` and
   `.nojekyll` are already committed.
8. **Verify end to end** — one submission per pipeline, checking at each
   hop that no email reached a public file. The repo is public and git
   history is permanent.

---

## 10. Known gaps at launch

- **No spam filtering.** The `approved` label is the only thing between a
  public form and a public page. Deferred until there is real spam to
  pattern-match against.
- **The org-invite job has never run.** Step 8 is its first execution.
- **Expert registrations go nowhere automatic.** They are an inbox with a
  Kit tag until someone works them.
- **Mobile.** The reference layout is a single text column, so this pivot
  should survive a phone better than the manifesto did — but it is still
  designed on a desktop first.
