# Niagara Assembly Intake Pivot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manifesto site's two-form endorsement/meetup pipeline with a plain-text one-page front door plus three intake pipelines — Kit-only joins, an approval-gated public board at `/board/`, and private registrations that can invite to the GitHub org.

**Architecture:** Buildless static site. Every form POSTs to a Google Form; a bound Apps Script turns the response into a GitHub Issue plus a Kit tag; a GitHub Action fires on the `approved` label and either commits a record to `data/board.json` or issues a GitHub org invitation. No server, no build step, no npm dependencies. All rendering happens client-side from committed JSON, escaped at the point of interpolation.

**Tech Stack:** Vanilla ES modules, `node --test` (Node 18+ built-in test runner), Python 3.11 + `unittest`, Rough.js (vendored, no CDN), Google Apps Script, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-20-niagaraassembly-intake-pivot-design.md`

## Global Constraints

- **Repo:** `niagaraassembly/site`. This exact string is `var REPO` in every `.gs` file.
- **No dependencies.** No npm install, no package.json, no CDN `<script src>`. Rough.js is vendored at `vendor/rough.min.js`.
- **No build step.** Files are served as authored. `python3 -m http.server 8019` is the dev server.
- **Membership levels, spelled exactly:** `List`, `Regional`, `Company`, `Champion`.
- **Kit tags, spelled exactly:** `na-list`, `na-member-regional`, `na-member-company`, `na-member-champion`, `na-board`, `na-expert`, `na-opensource`.
- **GitHub labels:** `approved`, `board`, `join`, `expert`, `opensource`.
- **Board post types, spelled exactly:** `standup`, `talk`, `demo`, `space`, `news`, `idea`.
- **`name` and `email` are never public.** They must not appear in any `<!--DATA-->` block, any `PUBLIC` list, or any committed JSON.
- **Escape at interpolation.** Every value rendered from `data/*.json` goes through `escapeHtml`; every URL through `safeHttpUrl`. The `approved` label is an editorial gate, not a security control.
- **Test commands:** `node --test tests/*.test.mjs` and `python3 -m unittest discover -s tests`. Both must pass before every commit.
- **Copy rule:** no confirmation message may imply a submission is published or a membership is granted. Submissions are "sent"; they "appear once reviewed".

---

## Execution: three batches

The ten tasks below are grouped into three batches, executed inline with a
review checkpoint after each. The task content is unchanged — only the
test cadence and the review gates are.

| Batch | Tasks | Verification |
|---|---|---|
| 1 — Logic core | 1–4 | All batch tests written first and run once (every one failing), then implemented, then run once green |
| 2 — Pages | 5–7 | One browser pass covering both pages |
| 3 — Wiring | 8–10 | `node --check` on all four `.gs`, the round-trip check, YAML parse |

Test suites run in under half a second, so the saving is not in test runs —
it is in review gates and context switches. Red-green survives inside each
batch: a test that never failed proves nothing, so every batch's tests are
run red before any implementation lands.

Commits stay per-task as written below. A batch is a review gate, not a
single commit.

---

### Task 1: Clear the ground

Delete the endorsement and meetup pipeline, move the manifesto out of the site, and seed the board's data file. Nothing new is built here — this task exists so every later task starts from a repo with no dead code in it. Both JSON files are currently `[]`, so no data is lost.

**Files:**
- Create: `extra-docs/statement.md`, `data/board.json`
- Delete: `assets/js/meetups.js`, `assets/js/endorsements.js`, `assets/js/faces.js`, `google-apps-script/endorse.gs`, `google-apps-script/meetup.gs`, `data/meetups.json`, `data/endorsements.json`, `tests/meetups.test.mjs`, `tests/endorsements.test.mjs`, `tests/faces.test.mjs`
- Modify: `index.html` (stripped to a placeholder; rebuilt in Task 7)

**Interfaces:**
- Consumes: nothing.
- Produces: `data/board.json` containing `[]` — the file every later task reads and writes.

- [ ] **Step 1: Confirm both data files are empty before deleting them**

```bash
cat data/endorsements.json data/meetups.json
```

Expected: two lines, each `[]`. **If either has records, stop** — the spec's claim that nothing is lost is false and this needs a migration decision.

- [ ] **Step 2: Move the manifesto prose to extra-docs**

The prose lives in `index.html` inside `<section id="face-statement">`. Extract every `<p>` in that section into a Markdown file, one paragraph per block, dropping the tags.

```bash
mkdir -p extra-docs
python3 - <<'PY'
import re, html
src = open('index.html').read()
sec = re.search(r'<section id="face-statement">(.*?)</section>', src, re.S).group(1)
paras = [html.unescape(re.sub(r'<[^>]+>', '', p)).strip()
         for p in re.findall(r'<p>(.*?)</p>', sec, re.S)]
open('extra-docs/statement.md', 'w').write(
    "# One neighbo(u)r to another\n\n"
    "The statement the site opened with, kept for reference. It is no longer\n"
    "published as a page.\n\n" + "\n\n".join(p for p in paras if p) + "\n")
PY
head -12 extra-docs/statement.md
wc -w extra-docs/statement.md
```

Expected: a title, the note, then the paragraphs. Word count in the low thousands. If it is under 500 the extraction missed the section — check the regex against the real markup before continuing.

- [ ] **Step 3: Delete the retired files**

```bash
git rm -q assets/js/meetups.js assets/js/endorsements.js assets/js/faces.js \
          google-apps-script/endorse.gs google-apps-script/meetup.gs \
          data/meetups.json data/endorsements.json \
          tests/meetups.test.mjs tests/endorsements.test.mjs tests/faces.test.mjs
```

- [ ] **Step 4: Seed the board data file**

```bash
echo '[]' > data/board.json
```

- [ ] **Step 5: Reduce index.html to a placeholder**

The full page is built in Task 7. For now it must be valid HTML that loads nothing deleted, so the repo is never in a broken state between commits.

```bash
cat > index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@NiagaraAssembly</title>
<meta name="description" content="A growing group of technologists, tradesmen, engineers and freighthoppers strengthening industry across the Niagara Peninsula.">
<link rel="stylesheet" href="assets/css/site.css">
</head>
<body>
<main><p>Under construction.</p></main>
</body>
</html>
HTML
```

- [ ] **Step 6: Verify the remaining suites still pass**

```bash
node --test tests/*.test.mjs
python3 -m unittest discover -s tests
```

Expected: the JS run passes (`tests/submit.test.mjs`, `tests/escape.test.mjs` remain). The Python run **fails** — `test_approve_request.py` still tests endorsements. That failure is expected and is fixed in Task 3; note it and continue.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Retire the endorsement and meetup pipeline

Both data files were empty, so nothing is migrated. The manifesto prose
moves to extra-docs/statement.md rather than being deleted. index.html is
a placeholder until the one-pager lands.

Python suite fails until Task 3 rewrites approve_request.py."
```

---

### Task 2: Validation for three pipelines

Rewrite `assets/js/submit.js` so it validates joins, board posts, and registrations. This is pure logic with no DOM, so it is fully testable under `node --test`.

The board validator is the load-bearing piece. Because the Board Google Form cannot mark any question required (a `news` post has no `When`), and because `submitTo` posts `no-cors` and therefore cannot observe a rejection, this function is the only thing standing between a visitor and a silently discarded submission.

**Files:**
- Modify: `assets/js/submit.js`
- Test: `tests/submit.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `MAX_TEXT: number` (2500)
  - `BOARD_TYPES: string[]`
  - `LEVELS: string[]`
  - `GH_USER: RegExp`
  - `buildFormBody(values: object, entryMap: object) => URLSearchParams` (unchanged)
  - `validateJoin(values) => string[]`
  - `validateBoard(values) => string[]`
  - `validateRegister(values) => string[]`
  - `submitTo(action: string, body: URLSearchParams) => Promise<void>` (unchanged)

  Every validator returns an array of field names, empty when valid. Tasks 6 and 7 call these; Task 3 mirrors the board rules in Python.

- [ ] **Step 1: Write the failing tests**

Replace the whole of `tests/submit.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TEXT, BOARD_TYPES, LEVELS, GH_USER,
  buildFormBody, validateJoin, validateBoard, validateRegister
} from '../assets/js/submit.js';

const join = (o = {}) => ({ name: 'Rosa', email: 'r@example.ca', level: 'List', ...o });

test('buildFormBody maps fields to entry ids and drops blanks', () => {
  const body = buildFormBody({ name: 'Rosa', email: '  ' }, { name: 'entry.1', email: 'entry.2' });
  assert.equal(body.get('entry.1'), 'Rosa');
  assert.equal(body.get('entry.2'), null);
});

test('join needs a name, an email and a known level', () => {
  assert.deepEqual(validateJoin(join()), []);
  assert.deepEqual(validateJoin(join({ name: '' })), ['name']);
  assert.deepEqual(validateJoin(join({ level: 'Platinum' })), ['level']);
});

test('every offered level validates', () => {
  assert.deepEqual(LEVELS, ['List', 'Regional', 'Company', 'Champion']);
  for (const level of LEVELS) assert.deepEqual(validateJoin(join({ level })), []);
});

test('an unknown board type is rejected before any field is checked', () => {
  assert.deepEqual(validateBoard({ type: 'rumour' }), ['type']);
  assert.deepEqual(validateBoard({}), ['type']);
});

test('board types are exactly the six in the spec', () => {
  assert.deepEqual(BOARD_TYPES, ['standup', 'talk', 'demo', 'space', 'news', 'idea']);
});

test('news needs no when, but standup does', () => {
  const news = { type: 'news', name: 'Rosa', email: 'r@example.ca',
                 title: 'Plant reopens', link: 'https://example.ca/x', description: 'Details.' };
  assert.deepEqual(validateBoard(news), []);

  const standup = { type: 'standup', name: 'Rosa', email: 'r@example.ca',
                    title: 'Open bench night', where: 'Welland', contact: 'rosa@example.ca' };
  assert.deepEqual(validateBoard(standup), ['when']);
});

test('every board type requires a name and an email', () => {
  for (const type of BOARD_TYPES) {
    const errors = validateBoard({ type });
    assert.ok(errors.includes('name'), `${type} should require name`);
    assert.ok(errors.includes('email'), `${type} should require email`);
  }
});

test('talk and demo require a presenter; standup does not', () => {
  const base = { name: 'Rosa', email: 'r@example.ca', title: 'T',
                 when: 'Thursday', where: 'Welland', contact: 'c@example.ca' };
  assert.deepEqual(validateBoard({ ...base, type: 'talk' }), ['presenter']);
  assert.deepEqual(validateBoard({ ...base, type: 'demo' }), ['presenter']);
  assert.deepEqual(validateBoard({ ...base, type: 'standup' }), []);
});

test('space needs a location, a description and a contact but no title', () => {
  const space = { type: 'space', name: 'Rosa', email: 'r@example.ca',
                  where: '12 Ross St', description: '900 sq ft, month to month.',
                  contact: 'rosa@example.ca' };
  assert.deepEqual(validateBoard(space), []);
});

test('idea needs only a title and a description', () => {
  const idea = { type: 'idea', name: 'Rosa', email: 'r@example.ca',
                 title: 'Shared CMM', description: 'One machine, six shops.' };
  assert.deepEqual(validateBoard(idea), []);
});

test('a non-http link is rejected wherever it appears', () => {
  const idea = { type: 'idea', name: 'Rosa', email: 'r@example.ca',
                 title: 'T', description: 'D', link: 'javascript:alert(1)' };
  assert.deepEqual(validateBoard(idea), ['link-not-http']);
});

test('an over-long description is rejected', () => {
  const idea = { type: 'idea', name: 'Rosa', email: 'r@example.ca',
                 title: 'T', description: 'x'.repeat(MAX_TEXT + 1) };
  assert.ok(validateBoard(idea).includes('description-too-long'));
});

test('expert registration needs expertise and region', () => {
  const expert = { kind: 'expert', name: 'Rosa', email: 'r@example.ca',
                   expertise: 'IPC-A-610', region: 'Niagara' };
  assert.deepEqual(validateRegister(expert), []);
  assert.deepEqual(validateRegister({ ...expert, region: '' }), ['region']);
});

test('open-source registration validates the GitHub username', () => {
  const oss = { kind: 'opensource', name: 'Rosa', email: 'r@example.ca',
                github_username: 'rosa-silva' };
  assert.deepEqual(validateRegister(oss), []);
  assert.deepEqual(validateRegister({ ...oss, github_username: 'rosa silva' }),
                   ['github-username']);
  assert.deepEqual(validateRegister({ ...oss, github_username: '-rosa' }),
                   ['github-username']);
});

test('an unknown registration kind is rejected', () => {
  assert.deepEqual(validateRegister({ kind: 'sponsor' }), ['kind']);
});

test('the username pattern matches GitHub\'s own rules', () => {
  assert.ok(GH_USER.test('a'));
  assert.ok(GH_USER.test('a-b-c'));
  assert.ok(!GH_USER.test('a--b'));
  assert.ok(!GH_USER.test('a-'));
  assert.ok(!GH_USER.test('x'.repeat(40)));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node --test tests/submit.test.mjs
```

Expected: FAIL — `SyntaxError: The requested module '../assets/js/submit.js' does not provide an export named 'MAX_TEXT'`.

- [ ] **Step 3: Write the implementation**

Replace the whole of `assets/js/submit.js`:

```js
/* Client-side validation and Google Form transport for every intake form.
 *
 * Why validation is heavier here than it looks like it needs to be: the
 * Board Google Form cannot mark ANY question required, because a `news`
 * post has no `When` and a required question would reject it. And
 * submitTo() posts no-cors, so the page cannot see a rejection — a
 * discarded submission looks identical to an accepted one. These
 * functions are therefore the only feedback a visitor ever gets.
 * scripts/approve_request.py mirrors the board rules as a second gate.
 */

export const MAX_TEXT = 2500;

export const LEVELS = ['List', 'Regional', 'Company', 'Champion'];

export const BOARD_TYPES = ['standup', 'talk', 'demo', 'space', 'news', 'idea'];

/* Field names are the stable HTML `name` attributes. The visible labels
   are rewritten per type by the page; these never change. */
const BOARD_REQUIRED = {
  standup: ['title', 'when', 'where', 'contact'],
  talk:    ['title', 'presenter', 'when', 'where', 'contact'],
  demo:    ['title', 'presenter', 'when', 'where', 'contact'],
  space:   ['where', 'description', 'contact'],
  news:    ['title', 'link', 'description'],
  idea:    ['title', 'description']
};

/* GitHub's own rule: alphanumeric, single hyphens only in the interior,
   39 characters maximum. Applied here so a bad value never reaches the
   shell command in .github/workflows/approve-request.yml. */
export const GH_USER = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export function buildFormBody(values, entryMap) {
  const body = new URLSearchParams();
  for (const [field, entryId] of Object.entries(entryMap)) {
    const v = values[field];
    if (v !== undefined && v !== null && String(v).trim().length > 0) {
      body.append(entryId, String(v));
    }
  }
  return body;
}

const missing = (v, keys) => keys.filter(k => !String(v[k] ?? '').trim());

export function validateJoin(v) {
  const errors = missing(v, ['name', 'email']);
  if (!LEVELS.includes(v.level)) errors.push('level');
  return errors;
}

export function validateBoard(v) {
  const type = String(v.type ?? '');
  if (!BOARD_TYPES.includes(type)) return ['type'];

  const errors = missing(v, ['name', 'email', ...BOARD_REQUIRED[type]]);

  /* Checked on every type, not just the ones that require a link: an
     optional link is still an href on a public page. */
  const link = String(v.link ?? '').trim();
  if (link && !/^https?:\/\//i.test(link)) errors.push('link-not-http');

  if (String(v.description ?? '').length > MAX_TEXT) errors.push('description-too-long');
  return errors;
}

export function validateRegister(v) {
  const kind = String(v.kind ?? '');

  if (kind === 'expert') {
    return missing(v, ['name', 'email', 'expertise', 'region']);
  }

  if (kind === 'opensource') {
    const errors = missing(v, ['name', 'email', 'github_username']);
    const username = String(v.github_username ?? '').trim();
    if (username && !GH_USER.test(username)) errors.push('github-username');
    return errors;
  }

  return ['kind'];
}

export async function submitTo(action, body) {
  await fetch(action, { method: 'POST', mode: 'no-cors', body });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node --test tests/*.test.mjs
```

Expected: PASS, all assertions.

- [ ] **Step 5: Commit**

```bash
git add assets/js/submit.js tests/submit.test.mjs
git commit -m "Validate joins, board posts and registrations client-side

The Board form cannot mark any Google question required without
rejecting valid posts of other types, and no-cors hides rejections, so
these functions are the only feedback a visitor gets."
```

---

### Task 3: Six board kinds in the approval script

Rewrite `scripts/approve_request.py` for the board. The `publish-comment` concept goes away entirely — it existed only for endorsements.

All six types write to one file with one id prefix, so ids run in a single sequence across the whole board rather than six parallel ones.

**Files:**
- Modify: `scripts/approve_request.py`
- Test: `tests/test_approve_request.py`

**Interfaces:**
- Consumes: `data/board.json` from Task 1.
- Produces:
  - `BOARD_TYPES: tuple[str, ...]`
  - `REQUIRED: dict[str, list[str]]`, `OPTIONAL: dict[str, list[str]]`, `PUBLIC: dict[str, list[str]]`, `TARGET: dict[str, tuple[str, str]]`
  - `extract_block(issue_body: str) -> dict`
  - `validate(record: dict) -> list[str]`
  - `append_record(path: str, record: dict) -> dict`
  - `main() -> int` — reads `ISSUE_BODY` from the environment, exits non-zero on an invalid record.

  Task 9 writes `<!--DATA-->` blocks this parses; Task 10 runs `main()` from the workflow.

- [ ] **Step 1: Write the failing tests**

Replace the whole of `tests/test_approve_request.py`:

```python
import json, os, tempfile, unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import approve_request as ar

ISSUE = """A stand-up was posted.

<!--DATA
{"kind":"standup","title":"Open bench night","when":"Thursday 7pm",
 "where":"Welland Fabrication, 12 Ross St","contact":"rosa@example.ca"}
DATA-->
"""


def board(**over):
    rec = {"kind": "standup", "title": "Open bench night", "when": "Thursday 7pm",
           "where": "12 Ross St", "contact": "rosa@example.ca"}
    rec.update(over)
    return rec


class TestExtract(unittest.TestCase):
    def test_pulls_the_json_out_of_the_comment(self):
        self.assertEqual(ar.extract_block(ISSUE)["title"], "Open bench night")

    def test_missing_block_raises(self):
        with self.assertRaises(ValueError):
            ar.extract_block("no data here")


class TestValidate(unittest.TestCase):
    def test_every_spec_type_is_known(self):
        self.assertEqual(list(ar.BOARD_TYPES),
                         ["standup", "talk", "demo", "space", "news", "idea"])

    def test_unknown_kind_is_rejected(self):
        self.assertEqual(ar.validate({"kind": "rumour"}), ["kind"])

    def test_standup_requires_its_fields(self):
        self.assertEqual(sorted(ar.validate({"kind": "standup"})),
                         ["contact", "title", "when", "where"])

    def test_news_does_not_require_a_when(self):
        rec = {"kind": "news", "title": "Plant reopens",
               "link": "https://example.ca/x", "description": "Details."}
        self.assertEqual(ar.validate(rec), [])

    def test_description_over_cap_is_rejected(self):
        rec = {"kind": "idea", "title": "T", "description": "x" * (ar.MAX_TEXT + 1)}
        self.assertIn("description-too-long", ar.validate(rec))

    def test_non_http_link_is_rejected(self):
        self.assertIn("link-not-http", ar.validate(board(link="javascript:alert(1)")))


class TestAppend(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp()) / "board.json"
        self.tmp.write_text("[]")

    def read(self):
        return json.loads(self.tmp.read_text())

    def test_writes_the_public_fields_and_the_type(self):
        out = ar.append_record(self.tmp, board())
        self.assertEqual(out["type"], "standup")
        self.assertEqual(out["title"], "Open bench night")
        self.assertEqual(self.read()[0]["where"], "12 Ross St")

    def test_never_writes_name_or_email(self):
        ar.append_record(self.tmp, board(name="Rosa Silva", email="rosa@example.ca"))
        written = self.read()[0]
        self.assertNotIn("name", written)
        self.assertNotIn("email", written)

    def test_drops_fields_that_are_not_public_for_that_type(self):
        # `presenter` is public on a talk, not on a stand-up.
        ar.append_record(self.tmp, board(presenter="Someone"))
        self.assertNotIn("presenter", self.read()[0])

    def test_stamps_todays_date_when_absent(self):
        out = ar.append_record(self.tmp, board())
        self.assertRegex(out["date"], r"^\d{4}-\d{2}-\d{2}$")

    def test_ids_stay_sequential_across_mixed_types(self):
        ar.append_record(self.tmp, board())
        ar.append_record(self.tmp, {"kind": "idea", "title": "Shared CMM",
                                    "description": "One machine, six shops."})
        self.assertEqual([r["id"] for r in self.read()], ["b-0001", "b-0002"])

    def test_all_six_types_land_in_one_file(self):
        for kind in ar.BOARD_TYPES:
            self.assertEqual(ar.TARGET[kind], ("data/board.json", "b"))


class TestMain(unittest.TestCase):
    def test_invalid_record_exits_non_zero(self):
        os.environ["ISSUE_BODY"] = '<!--DATA {"kind":"standup"} DATA-->'
        self.assertEqual(ar.main(), 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
python3 -m unittest discover -s tests
```

Expected: FAIL with `AttributeError: module 'approve_request' has no attribute 'BOARD_TYPES'`.

- [ ] **Step 3: Write the implementation**

Replace the whole of `scripts/approve_request.py`:

```python
#!/usr/bin/env python3
"""Turn an approved GitHub Issue into a committed board record.

The only writer of data/board.json. `name` and `email` are dropped here as
well as upstream in the Apps Script: this is the last gate before a public
commit, and git history is permanent.

All six board types share one file and one id prefix, so ids run in a
single sequence across the board rather than six parallel ones.
"""
import json, os, re, sys
from datetime import date
from pathlib import Path

MAX_TEXT = 2500
BLOCK = re.compile(r"<!--DATA\s*(\{.*?\})\s*DATA-->", re.S)

BOARD_TYPES = ("standup", "talk", "demo", "space", "news", "idea")

# Mirrors BOARD_REQUIRED in assets/js/submit.js. Two gates, deliberately:
# the browser gate gives the visitor feedback, this one is what a public
# commit has to get past.
REQUIRED = {
    "standup": ["title", "when", "where", "contact"],
    "talk":    ["title", "presenter", "when", "where", "contact"],
    "demo":    ["title", "presenter", "when", "where", "contact"],
    "space":   ["where", "description", "contact"],
    "news":    ["title", "link", "description"],
    "idea":    ["title", "description"],
}

OPTIONAL = {
    "standup": ["description", "link"],
    "talk":    ["description", "link"],
    "demo":    ["description", "link"],
    "space":   ["link"],
    "news":    [],
    "idea":    ["link", "contact"],
}

TARGET = {kind: ("data/board.json", "b") for kind in BOARD_TYPES}

# An allowlist, not a denylist. A field absent from here is never written,
# so a new field added upstream cannot leak by default.
PUBLIC = {
    kind: ["id", "type", *REQUIRED[kind], *OPTIONAL[kind], "date"]
    for kind in BOARD_TYPES
}


def extract_block(issue_body):
    m = BLOCK.search(issue_body or "")
    if not m:
        raise ValueError("no <!--DATA ... DATA--> block in the issue body")
    return json.loads(m.group(1))


def validate(record):
    kind = record.get("kind")
    if kind not in REQUIRED:
        return ["kind"]
    errors = [f for f in REQUIRED[kind] if not str(record.get(f, "")).strip()]
    link = str(record.get("link", "")).strip()
    if link and not re.match(r"^https?://", link, re.I):
        errors.append("link-not-http")
    if len(str(record.get("description", ""))) > MAX_TEXT:
        errors.append("description-too-long")
    return errors


def next_id(records, prefix):
    n = 0
    for r in records:
        try:
            n = max(n, int(str(r.get("id", "")).split("-")[-1]))
        except ValueError:
            continue
    return f"{prefix}-{n + 1:04d}"


def append_record(path, record):
    path = Path(path)
    kind = record["kind"]
    prefix = TARGET[kind][1]
    records = json.loads(path.read_text() or "[]")

    out = {"id": next_id(records, prefix), "type": kind}
    for field in PUBLIC[kind]:
        if field in ("id", "type"):
            continue
        if field == "date":
            out["date"] = record.get("date") or date.today().isoformat()
        elif str(record.get(field, "")).strip():
            out[field] = record[field]

    records.append(out)
    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n")
    return out


def main():
    record = extract_block(os.environ.get("ISSUE_BODY", ""))
    errors = validate(record)
    if errors:
        print(f"invalid record, missing or bad: {', '.join(errors)}", file=sys.stderr)
        return 1
    written = append_record(TARGET[record["kind"]][0], record)
    print(f"wrote {written['id']} to {TARGET[record['kind']][0]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
python3 -m unittest discover -s tests
node --test tests/*.test.mjs
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/approve_request.py tests/test_approve_request.py
git commit -m "Write six board types into one data file

One file and one id prefix means one sequential id series across the
board. PUBLIC stays an allowlist so a field added upstream cannot leak
by default. publish-comment goes with the endorsements it served."
```

---

### Task 4: Board rendering

Build `assets/js/board.js`, which turns `data/board.json` into HTML. Kept separate from the page so the pure functions are testable without a DOM.

**Files:**
- Create: `assets/js/board.js`, `tests/board.test.mjs`

**Interfaces:**
- Consumes: `escapeHtml`, `safeHttpUrl` from `assets/js/escape.js` (unchanged).
- Produces:
  - `TYPE_ORDER: string[]`
  - `TYPE_LABELS: Record<string, string>`
  - `groupByType(records) => Array<{ type, label, records }>` — only non-empty groups, in `TYPE_ORDER`, records newest first
  - `cardHtml(record) => string`
  - `mountBoard(records, root) => void` — sets `root.innerHTML`

  Task 6's `board/index.html` calls `mountBoard`.

- [ ] **Step 1: Write the failing tests**

Create `tests/board.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { TYPE_ORDER, TYPE_LABELS, groupByType, cardHtml, mountBoard }
  from '../assets/js/board.js';

const rec = (o = {}) => ({ id: 'b-0001', type: 'standup', title: 'Open bench night',
                           when: 'Thursday 7pm', where: '12 Ross St',
                           contact: 'rosa@example.ca', date: '2026-08-20', ...o });

test('every board type has a label and a place in the order', () => {
  assert.deepEqual(TYPE_ORDER, ['standup', 'talk', 'demo', 'space', 'news', 'idea']);
  for (const type of TYPE_ORDER) assert.equal(typeof TYPE_LABELS[type], 'string');
});

test('groups follow TYPE_ORDER regardless of input order', () => {
  const groups = groupByType([rec({ type: 'idea', id: 'b-0002' }), rec()]);
  assert.deepEqual(groups.map(g => g.type), ['standup', 'idea']);
});

test('empty groups are omitted', () => {
  assert.deepEqual(groupByType([rec()]).map(g => g.type), ['standup']);
});

test('records within a group run newest first', () => {
  const groups = groupByType([
    rec({ id: 'b-0001', date: '2026-01-01' }),
    rec({ id: 'b-0002', date: '2026-08-01' })
  ]);
  assert.deepEqual(groups[0].records.map(r => r.id), ['b-0002', 'b-0001']);
});

test('records sharing a date fall back to id, newest first', () => {
  const groups = groupByType([rec({ id: 'b-0001' }), rec({ id: 'b-0003' })]);
  assert.deepEqual(groups[0].records.map(r => r.id), ['b-0003', 'b-0001']);
});

test('cardHtml escapes every rendered value', () => {
  const html = cardHtml(rec({ title: '<script>alert(1)</script>' }));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('cardHtml renders an http link and refuses anything else', () => {
  assert.ok(cardHtml(rec({ link: 'https://example.ca/x' })).includes('href="https://example.ca/x"'));
  assert.ok(!cardHtml(rec({ link: 'javascript:alert(1)' })).includes('href='));
});

test('cardHtml omits absent fields rather than rendering empties', () => {
  const html = cardHtml({ id: 'b-0002', type: 'idea', title: 'Shared CMM',
                          description: 'One machine, six shops.', date: '2026-08-20' });
  assert.ok(!html.includes('card__when'));
  assert.ok(!html.includes('card__where'));
  assert.ok(html.includes('Shared CMM'));
});

test('cards carry the sketch hook so rough.js draws their border', () => {
  assert.ok(cardHtml(rec()).includes('data-sketch="box"'));
});

test('mountBoard writes grouped markup into the root', () => {
  const root = { innerHTML: '' };
  mountBoard([rec()], root);
  assert.ok(root.innerHTML.includes(TYPE_LABELS.standup));
  assert.ok(root.innerHTML.includes('Open bench night'));
});

test('mountBoard says so when the board is empty', () => {
  const root = { innerHTML: '' };
  mountBoard([], root);
  assert.ok(/nothing/i.test(root.innerHTML));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node --test tests/board.test.mjs
```

Expected: FAIL — `Cannot find module '../assets/js/board.js'`.

- [ ] **Step 3: Write the implementation**

Create `assets/js/board.js`:

```js
/* Renders data/board.json.
 *
 * Split from the page so groupByType and cardHtml can be tested without a
 * DOM — mountBoard is the only function that touches one, and it touches
 * exactly one property.
 *
 * Every value here came from a public form and passed only an EDITORIAL
 * approval gate. Nothing is trusted to be inert; escapeHtml and
 * safeHttpUrl are applied at the point of interpolation, not upstream.
 */
import { escapeHtml, safeHttpUrl } from './escape.js';

export const TYPE_ORDER = ['standup', 'talk', 'demo', 'space', 'news', 'idea'];

export const TYPE_LABELS = {
  standup: 'Stand-ups',
  talk:    'Talks',
  demo:    'Demos',
  space:   'Space offered',
  news:    'News',
  idea:    'Ideas'
};

/* Newest first. Date is a plain ISO string so a string compare is a date
   compare; id breaks ties because two posts on one day are common and an
   unstable order would reshuffle the page on every load. */
function newestFirst(a, b) {
  const byDate = String(b.date ?? '').localeCompare(String(a.date ?? ''));
  return byDate !== 0 ? byDate : String(b.id ?? '').localeCompare(String(a.id ?? ''));
}

export function groupByType(records) {
  return TYPE_ORDER
    .map((type) => ({
      type,
      label: TYPE_LABELS[type],
      records: records.filter((r) => r.type === type).sort(newestFirst)
    }))
    .filter((group) => group.records.length > 0);
}

export function cardHtml(record) {
  const e = escapeHtml;
  const rows = [];

  if (record.title)       rows.push(`<h3 class="card__title">${e(record.title)}</h3>`);
  if (record.presenter)   rows.push(`<p class="card__by">${e(record.presenter)}</p>`);
  if (record.when)        rows.push(`<p class="card__when">${e(record.when)}</p>`);
  if (record.where)       rows.push(`<p class="card__where">${e(record.where)}</p>`);
  if (record.description) rows.push(`<p class="card__desc">${e(record.description)}</p>`);

  const url = safeHttpUrl(record.link);
  if (url) rows.push(`<p class="card__link"><a href="${e(url)}" rel="noopener">${e(url)}</a></p>`);

  if (record.contact) rows.push(`<p class="card__contact">${e(record.contact)}</p>`);

  return `<article class="card" data-sketch="box" data-type="${e(record.type)}">` +
         rows.join('') + `</article>`;
}

export function mountBoard(records, root) {
  const groups = groupByType(records ?? []);

  if (groups.length === 0) {
    root.innerHTML = `<p class="board__empty">There is nothing on the board yet. ` +
                     `Post the first thing.</p>`;
    return;
  }

  root.innerHTML = groups.map((group) =>
    `<section class="board__group">` +
      `<h2 class="board__heading">${escapeHtml(group.label)}</h2>` +
      group.records.map(cardHtml).join('') +
    `</section>`
  ).join('');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node --test tests/*.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/js/board.js tests/board.test.mjs
git commit -m "Render the board from committed JSON

groupByType and cardHtml are pure so they test without a DOM. mountBoard
touches one property, which is all the fake root in the tests needs."
```

---

### Task 5: The hand-drawn frame and the plain-document stylesheet

Port Rough.js and `sketch.js` from the sibling `site/` project, retune them, and rewrite `site.css` as a plain document with one drawn bounding box.

Two properties of `sketch.js` are load-bearing and must survive the port unchanged in substance:

1. **Seeds derive from element index, never randomness.** Rough.js re-rolls on every call, so an unseeded redraw reshapes every border and the page appears to twitch on resize.
2. **`.sketched` lands on `<html>` only after a successful draw.** That class is what suppresses the CSS fallback borders. If the vendored file 404s or throws, the page keeps clean plain borders — it degrades to plain, never to borderless.

**Files:**
- Create: `vendor/rough.min.js`, `assets/js/sketch.js`
- Modify: `assets/css/site.css`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `[data-sketch="frame"]` — the page bounding box
  - `[data-sketch="box"]` — form fieldsets and board cards
  - `window.NASketch.redraw()` — redraws the registry. **Task 6 replaces
    this binding** with `registerNew`, which re-scans for elements that
    appeared after `init()` ran; the name `redraw` is what callers use in
    both versions.
  - CSS custom properties `--ink`, `--paper`, `--rule`, `--sans`, `--hand`, `--mono`, `--measure`

  Tasks 6 and 7 put `data-sketch` attributes on their markup and rely on these class names.

- [ ] **Step 1: Vendor Rough.js**

```bash
mkdir -p vendor
cp ../site/vendor/rough.min.js vendor/rough.min.js
ls -l vendor/rough.min.js
```

Expected: about 27 KB. If the sibling checkout is not present, fetch `rough.min.js` from a Rough.js release and place it at the same path — it must be vendored, never loaded from a CDN.

- [ ] **Step 2: Port sketch.js without the garage glyph**

```bash
cp ../site/assets/js/sketch.js assets/js/sketch.js
```

Then make exactly these four edits:

Delete the entire `drawGarage` function (from the `/* The garage glyph` comment through its closing `}` and the blank line after it) — it is a Paton Hall mark and has no place here. Then delete its dispatch branch in `drawOne`:

```js
    } else if (entry.kind === 'garage') {
      node = drawGarage(rc, w, h, opts);
```

Rename the global export at the foot of the file:

```js
  window.NASketch = {
    redraw: drawAll,
    _registry: registry,
    _seedFor: seedFor
  };
```

Retune `PARAMS` — the sibling's values read slightly loose against plain text at this scale:

```js
  var PARAMS = {
    roughness:   0.7,
    bowing:      0.45,
    strokeWidth: 1.4,
    fillStyle:   'solid'
  };
```

Update the file's header comment so it names this site rather than the other one.

- [ ] **Step 3: Verify the port is syntactically sound and free of the removed glyph**

```bash
node --check assets/js/sketch.js
grep -c "garage\|PatonSketch" assets/js/sketch.js
```

Expected: `node --check` prints nothing. The grep prints `0`. **If the grep prints anything else, a reference survived** and the file will throw at the moment it draws — fix before continuing.

- [ ] **Step 4: Rewrite the stylesheet**

Replace the whole of `assets/css/site.css`:

```css
/* Niagara Assembly — a plain document with one drawn box around it.
 *
 * The reference is a near-unstyled page: one left-aligned column, ink on
 * paper, no imagery. Everything decorative is carried by the Rough.js
 * frame, so this file's job is mostly restraint.
 *
 * The border rules below come in pairs. The plain rule is the fallback;
 * the `.sketched` rule removes it once assets/js/sketch.js has
 * successfully drawn. If that script never runs, the page keeps every
 * border it has here.
 */

:root {
  --ink:      #17181a;
  --ink-soft: #55585d;
  --paper:    #f7f6f3;
  --rule:     #c9c6bf;

  --measure: 46rem;

  /* Prose is a system sans, per the reference's neutrality. The hand face
     is confined to interactive chrome so the drawn frame and the drawn
     type agree with each other while the prose stays serious.
     To try the alternative, swap the first family in --hand for
     'Caveat' or 'Patrick Hand'; nothing else changes. */
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  --hand: 'Comic Sans MS', 'Comic Neue', 'Segoe Print', 'Bradley Hand', cursive;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

@media (prefers-color-scheme: dark) {
  :root { --ink: #e9e7e2; --ink-soft: #a3a099; --paper: #16171a; --rule: #3a3c40; }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 2.5rem 1.25rem 4rem;
  background: var(--paper);
  color: var(--ink);
  font: 1rem/1.65 var(--sans);
}

/* The bounding box. Position is relative so sketch.js can absolutely
   position its SVG against it. */
.frame {
  position: relative;
  max-width: var(--measure);
  margin: 0 auto;
  padding: 3rem 2.5rem;
  border: 1.4px solid var(--ink);
}
.sketched .frame { border-color: transparent; }

.sketch-svg { position: absolute; pointer-events: none; overflow: visible; }

h1 {
  font: 400 clamp(1.9rem, 6vw, 2.6rem)/1.1 var(--sans);
  letter-spacing: -0.02em;
  margin: 0 0 2rem;
}
h2 { font: 600 1.05rem/1.3 var(--sans); margin: 2.5rem 0 .75rem; }
h3 { font: 600 1rem/1.3 var(--sans); margin: 0 0 .35rem; }

p { margin: 0 0 1.15em; max-width: 40rem; }

a { color: var(--ink); text-underline-offset: 2px; }

ul.plain { list-style: none; padding: 0; margin: 0 0 1.5rem; }
ul.plain li { margin: 0 0 .55rem; }
ul.plain li::before { content: '- '; color: var(--ink-soft); }

/* Forms ------------------------------------------------------------- */

fieldset {
  position: relative;
  margin: 0 0 2rem;
  padding: 1.5rem 1.25rem;
  border: 1.4px solid var(--ink);
}
.sketched fieldset { border-color: transparent; }

legend { font: 600 .95rem/1 var(--hand); padding: 0 .4rem; }

label { display: block; margin: 0 0 .9rem; font: .8125rem/1.4 var(--hand); }
label input, label select, label textarea {
  display: block;
  width: 100%;
  margin-top: .3rem;
  padding: .45rem .55rem;
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--rule);
  font: .9375rem/1.4 var(--sans);
}
textarea { min-height: 6rem; resize: vertical; }

.opt { color: var(--ink-soft); font-weight: 400; }

.fineprint { font: .75rem/1.5 var(--sans); color: var(--ink-soft); max-width: 34rem; }

button[type="submit"] {
  padding: .5rem 1.1rem;
  background: transparent;
  color: var(--ink);
  border: 1.4px solid var(--ink);
  font: .9375rem/1 var(--hand);
  cursor: pointer;
}

.status { min-height: 1.4em; font: .8125rem/1.5 var(--sans); color: var(--ink-soft); }
.status[data-state="error"] { color: var(--ink); font-weight: 600; }

/* Board -------------------------------------------------------------- */

.board__group { margin: 0 0 2.5rem; }
.board__heading { font: 600 .75rem/1 var(--sans); letter-spacing: .14em;
                  text-transform: uppercase; color: var(--ink-soft);
                  margin: 0 0 1rem; }
.board__empty { color: var(--ink-soft); }

.card {
  position: relative;
  margin: 0 0 1rem;
  padding: 1.1rem 1.25rem;
  border: 1.4px solid var(--rule);
}
.sketched .card { border-color: transparent; }

.card__title { font: 600 1rem/1.3 var(--hand); margin: 0 0 .35rem; }
.card__by,
.card__when,
.card__where { margin: 0 0 .2rem; font: .875rem/1.4 var(--mono); color: var(--ink-soft); }
.card__desc { margin: .6rem 0 .4rem; }
.card__link,
.card__contact { margin: 0 0 .2rem; font: .8125rem/1.4 var(--mono); }

/* Hidden per-type fields on the board form are toggled by the page. */
[hidden] { display: none !important; }
```

- [ ] **Step 5: Commit**

```bash
git add vendor/rough.min.js assets/js/sketch.js assets/css/site.css
git commit -m "Port the sketched frame and rewrite the stylesheet as plain document

sketch.js arrives from the sibling site minus its garage glyph, with
roughness and bowing dialled back for text at this scale. Its two
load-bearing properties survive: index-derived seeds, and .sketched only
after a successful draw so a failed load degrades to plain borders.

Hand face is confined to legends, labels, buttons and card titles; prose
stays system sans. --hand is one token, so trying Caveat is a one-line
change."
```

---

### Task 6: The board page

Build `board/index.html`, served at `niagaraassembly.com/board`.

This is a directory index, not a page: GitHub Pages serves `/board/` from `board/index.html` and 301-redirects `/board` to it. A root-level `board.html` would only ever be reachable as `/board.html`.

Because the page sits one level down, its asset and data references are `../`-prefixed. This is the one place a wrong path yields a silently empty board rather than an error, so it must be checked over HTTP.

**Files:**
- Create: `board/index.html`

**Interfaces:**
- Consumes: `mountBoard` from `assets/js/board.js` (Task 4); `data/board.json` (Task 1); `data-sketch` and the class names from Task 5.
- Produces: nothing later tasks consume, beyond the URL `/board/` that Task 7 links to.

- [ ] **Step 1: Write the page**

```bash
mkdir -p board
cat > board/index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Board — @NiagaraAssembly</title>
<meta name="description" content="Stand-ups, talks, demos, space, news and ideas posted by the Niagara Assembly network.">
<!-- One level down: every path here is ../-prefixed. A wrong path shows an
     empty board rather than an error, so this page is checked over HTTP. -->
<link rel="stylesheet" href="../assets/css/site.css">
</head>
<body>

<div class="frame" data-sketch="frame">

  <h1>The Board</h1>

  <p>Everything below was posted by someone in the network and reviewed
  before it appeared. <a href="../#post">Post something</a>.</p>

  <div id="board"><p class="board__empty">Loading…</p></div>

</div>

<script src="../vendor/rough.min.js" defer></script>
<script type="module">
  import { mountBoard } from '../assets/js/board.js';

  const root = document.getElementById('board');
  try {
    const records = await fetch('../data/board.json').then((r) => {
      if (!r.ok) throw new Error(`board.json: HTTP ${r.status}`);
      return r.json();
    });
    mountBoard(records, root);
  } catch (err) {
    /* Say so rather than leaving "Loading…" on screen forever — a stuck
       spinner is indistinguishable from an empty board. */
    console.error(err);
    root.innerHTML = '<p class="board__empty">The board could not be loaded. ' +
                     'Please reload.</p>';
  }

  /* sketch.js runs on DOMContentLoaded, which has already fired by the
     time this module's fetch resolves — so the cards it needs to draw
     did not exist when it registered. Redraw once they do. */
  if (window.NASketch) window.NASketch.redraw();
</script>
</body>
</html>
HTML
```

- [ ] **Step 2: Note the registration gap and fix it in sketch.js**

`NASketch.redraw()` only redraws elements already in its registry. Cards mounted after `init()` ran are not in it. Add a `register` entry point to `assets/js/sketch.js`, immediately above the `window.NASketch` assignment:

```js
  /* Elements that appear after init() — board cards mounted from fetched
     JSON — are not in the registry, so redraw() alone would skip them.
     This re-scans, adding only what is new, then draws. */
  function registerNew() {
    var els = document.querySelectorAll('[data-sketch]');
    for (var i = 0; i < els.length; i++) {
      var known = false;
      for (var j = 0; j < registry.length; j++) {
        if (registry[j].el === els[i]) { known = true; break; }
      }
      if (!known) registry.push({ el: els[i], kind: els[i].getAttribute('data-sketch'),
                                  index: registry.length });
    }
    return drawAll();
  }
```

And expose it:

```js
  window.NASketch = {
    redraw: registerNew,
    drawAll: drawAll,
    _registry: registry,
    _seedFor: seedFor
  };
```

- [ ] **Step 3: Verify over HTTP with real data**

```bash
cat > data/board.json <<'JSON'
[
  {"id":"b-0001","type":"standup","title":"Open bench night",
   "when":"Thursday 7pm","where":"Welland Fabrication, 12 Ross St",
   "contact":"rosa@example.ca","date":"2026-08-20"},
  {"id":"b-0002","type":"news","title":"Plant reopens in Thorold",
   "link":"https://example.ca/thorold","description":"Two hundred jobs.",
   "date":"2026-08-19"}
]
JSON
python3 -m http.server 8019 &
sleep 1
curl -s http://localhost:8019/board/ | head -20
```

Expected: the page's HTML. Then open `http://localhost:8019/board/` in a browser and confirm: two cards appear under **Stand-ups** and **News**; each card has a drawn border, not a plain one; the page has a drawn bounding box; the console is clean.

**If the cards have plain grey borders**, `NASketch.redraw()` did not pick them up — check Step 2 landed.
**If the board says "could not be loaded"**, the `../data/board.json` path is wrong for the directory depth.

- [ ] **Step 4: Reset the fixture and stop the server**

```bash
echo '[]' > data/board.json
kill %1
```

The seeded records were for eyeballing only. Committing them would put invented posts on the live board.

- [ ] **Step 5: Confirm the fixture is gone, then commit**

```bash
cat data/board.json
git add board/index.html assets/js/sketch.js
git commit -m "Serve the board at /board as a directory index

A root board.html is only reachable as /board.html. Paths on this page
are ../-prefixed, which fails silently as an empty board, so it is
verified over HTTP rather than by inspection.

sketch.js gains registerNew(): cards mounted from fetched JSON are not in
the registry init() built, so redraw() alone would skip them."
```

Expected: `cat` prints `[]`. **If it prints the fixture records, do not commit** — reset the file first.

---

### Task 7: The one-pager

Rebuild `index.html` as the front door from the reference: the statement, the list of ways to get involved, and all three intake forms.

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `validateJoin`, `validateBoard`, `validateRegister`, `buildFormBody`, `submitTo`, `MAX_TEXT` from `assets/js/submit.js` (Task 2); the class names and `data-sketch` hooks from Task 5.
- Produces: the `*_ACTION` and `*_MAP` placeholder constants that §9 of the spec tells the operator to replace with real Google Form values.

- [ ] **Step 1: Write the page**

```bash
cat > index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@NiagaraAssembly</title>
<meta name="description" content="A growing group of technologists, tradesmen, engineers and freighthoppers strengthening industry across the Niagara Peninsula.">
<link rel="stylesheet" href="assets/css/site.css">
</head>
<body>

<div class="frame" data-sketch="frame">

  <h1>@NiagaraAssembly</h1>

  <p>@NiagaraAssembly is a growing group of technologists, tradesmen, engineers
  and freighthoppers who believe the Niagara Peninsula is the best place in
  Canada to strengthen old industries and bring to life the factories, products
  and processes defining the future. Join the mailing list or become a Member.</p>

  <p>NA connects industrial operators and entrepreneurs through stand-ups,
  special events, certified training and peer-led workshops. As a members-led
  company, our goal is to help Members pioneer the work spaces and digital tools
  that lift all boats. The time has come to accelerate our industries.</p>

  <p>As we grow the Membership and support self-organizing, we are testing out
  product and service ideas that can make us profitable and have major impact
  across the region and beyond — from mobile electronics specialist training, to
  real estate and logistics visualization systems, to Integrated Production
  Environments using Theia.</p>

  <p>Got some space in old Hamilton where we can hang our hats?<br>
  <a href="mailto:hello@niagaraassembly.com">hello@niagaraassembly.com</a></p>

  <h2>How can you get involved?</h2>

  <ul class="plain">
    <li>Host a simple stand-up to get people and conversations connected.</li>
    <li>Organize a public talk, a product demo or make space for a startup.</li>
    <li>Register as an expert to lead training or workshops in the region.</li>
    <li>Share news with the network about investment opportunities.</li>
    <li>Help us develop open source software and systems.</li>
    <li>Share your ideas for advancing industry in Niagara.</li>
  </ul>

  <p><a href="board/">See what's on the board</a>.</p>

  <!-- Join ------------------------------------------------------------ -->
  <form id="join-form" novalidate>
    <fieldset data-sketch="box">
      <legend>Join</legend>
      <label>Name <input name="name" required autocomplete="name"></label>
      <label>Email <input name="email" type="email" required autocomplete="email"></label>
      <label>I'd like to
        <select name="level">
          <option value="List">stay on the mailing list</option>
          <option value="Regional">become a Regional Member</option>
          <option value="Company">become a Company Member</option>
          <option value="Champion">become a Champion Member</option>
        </select>
      </label>
      <p class="fineprint">Membership beyond the mailing list is an expression of
      interest — nothing is charged and no membership is conferred by this form.
      Someone will be in touch.</p>
      <button type="submit">Send</button>
      <p class="status" id="join-status" role="status"></p>
    </fieldset>
  </form>

  <!-- Post to the board ------------------------------------------------ -->
  <form id="board-form" novalidate>
    <fieldset data-sketch="box">
      <legend id="post">Post to the board</legend>

      <label>What is this?
        <select name="type" id="board-type">
          <option value="standup">A simple stand-up</option>
          <option value="talk">A public talk</option>
          <option value="demo">A product demo</option>
          <option value="space">Space for a startup</option>
          <option value="news">Investment or expansion news</option>
          <option value="idea">An idea for Niagara industry</option>
        </select>
      </label>

      <p class="fineprint" id="board-hint"></p>

      <label>Name <input name="name" required autocomplete="name"></label>
      <label>Email <input name="email" type="email" required autocomplete="email"></label>

      <label data-field="title"><span data-label-for="title">Title</span>
        <input name="title"></label>
      <label data-field="presenter">Presenter
        <input name="presenter"></label>
      <label data-field="when">When
        <input name="when" placeholder="Thursday 14 May, 7pm"></label>
      <label data-field="where"><span data-label-for="where">Where</span>
        <input name="where"></label>
      <label data-field="description"><span data-label-for="description">Description</span>
        <textarea name="description"></textarea>
        <span class="opt" id="board-counter"></span></label>
      <label data-field="link">Link <span class="opt" data-optional-note>optional</span>
        <input name="link" type="url" placeholder="https://"></label>
      <label data-field="contact">Public contact <span class="opt" data-optional-note>optional</span>
        <input name="contact" placeholder="an email or phone you're happy to publish"></label>

      <p class="fineprint">Your name and email are used for follow-up and are
      never published. Everything else appears on the board once reviewed.</p>
      <button type="submit">Send</button>
      <p class="status" id="board-status" role="status"></p>
    </fieldset>
  </form>

  <!-- Register --------------------------------------------------------- -->
  <form id="register-form" novalidate>
    <fieldset data-sketch="box">
      <legend>Register</legend>

      <label>I want to
        <select name="kind" id="register-kind">
          <option value="expert">lead training or workshops</option>
          <option value="opensource">help build the open source software</option>
        </select>
      </label>

      <label>Name <input name="name" required autocomplete="name"></label>
      <label>Email <input name="email" type="email" required autocomplete="email"></label>

      <label data-rfield="expertise">Expertise
        <input name="expertise" placeholder="IPC-A-610, PLC commissioning, …"></label>
      <label data-rfield="credentials">Credentials <span class="opt">optional</span>
        <input name="credentials"></label>
      <label data-rfield="region">Region
        <input name="region" placeholder="Niagara, Hamilton, Buffalo, …"></label>
      <label data-rfield="availability">Availability <span class="opt">optional</span>
        <input name="availability"></label>

      <label data-rfield="github_username">GitHub username
        <input name="github_username" placeholder="rosa-silva" autocapitalize="off" spellcheck="false"></label>
      <label data-rfield="interest">What you'd like to work on <span class="opt">optional</span>
        <textarea name="interest"></textarea></label>

      <p class="fineprint">Nothing here is published. Approved open source
      registrations receive an invitation to the niagaraassembly GitHub
      organization.</p>
      <button type="submit">Send</button>
      <p class="status" id="register-status" role="status"></p>
    </fieldset>
  </form>

</div>

<script src="vendor/rough.min.js" defer></script>
<script type="module">
  import { buildFormBody, submitTo, MAX_TEXT,
           validateJoin, validateBoard, validateRegister } from './assets/js/submit.js';

  /* Placeholders. docs/SETUP.md §5 replaces these with real values read
     from FB_PUBLIC_LOAD_DATA_ in each live form's page source — NOT from a
     pre-filled link, which yields ids that look right and silently drop
     values for some question types. */
  const JOIN_ACTION = 'FORM_URL_JOIN';
  const JOIN_MAP = { name: 'entry.0', email: 'entry.0', level: 'entry.0' };

  const BOARD_ACTION = 'FORM_URL_BOARD';
  const BOARD_MAP = { type: 'entry.0', name: 'entry.0', email: 'entry.0',
                      title: 'entry.0', presenter: 'entry.0', when: 'entry.0',
                      where: 'entry.0', description: 'entry.0', link: 'entry.0',
                      contact: 'entry.0' };

  const REGISTER_ACTION = 'FORM_URL_REGISTER';
  const REGISTER_MAP = { kind: 'entry.0', name: 'entry.0', email: 'entry.0',
                         expertise: 'entry.0', credentials: 'entry.0',
                         region: 'entry.0', availability: 'entry.0',
                         github_username: 'entry.0', interest: 'entry.0' };

  /* Per-type field visibility and labelling for the board form. The `name`
     attributes never change; only what the visitor reads does. */
  const BOARD_SHAPE = {
    standup: { show: ['title', 'when', 'where', 'contact', 'description', 'link'],
               labels: { title: "What's the stand-up about?", where: 'Where' },
               hint: 'A low-ceremony gathering. Say what it is, when and where.' },
    talk:    { show: ['title', 'presenter', 'when', 'where', 'contact', 'description', 'link'],
               labels: { title: 'Talk title', where: 'Venue' },
               hint: 'A public talk. Who is speaking, and where can people hear it?' },
    demo:    { show: ['title', 'presenter', 'when', 'where', 'contact', 'description', 'link'],
               labels: { title: 'What are you demoing?', where: 'Venue' },
               hint: 'Show something you have built.' },
    space:   { show: ['where', 'description', 'contact', 'link'],
               labels: { where: 'Where the space is', description: 'Size, terms, what suits it' },
               hint: 'Space a young company could use. Say roughly what and roughly on what terms.' },
    news:    { show: ['title', 'link', 'description'],
               labels: { title: 'Headline', description: 'Why it matters here' },
               hint: 'Expansion or investment news. A link and a few lines.' },
    idea:    { show: ['title', 'description', 'link', 'contact'],
               labels: { title: 'Your idea, in a line', description: 'Say more' },
               hint: 'Something the region should be doing.' }
  };

  const boardForm = document.getElementById('board-form');
  const boardType = document.getElementById('board-type');
  const boardHint = document.getElementById('board-hint');

  function shapeBoardForm() {
    const shape = BOARD_SHAPE[boardType.value];
    boardHint.textContent = shape.hint;

    for (const label of boardForm.querySelectorAll('[data-field]')) {
      const field = label.dataset.field;
      const shown = shape.show.includes(field);
      label.hidden = !shown;
      /* A hidden field must not carry a stale value into the submission —
         switching from `talk` to `news` would otherwise post a presenter. */
      if (!shown) for (const input of label.querySelectorAll('input, textarea')) input.value = '';

      const span = label.querySelector('[data-label-for]');
      if (span && shape.labels[field]) span.textContent = shape.labels[field];
    }
  }

  boardType.addEventListener('change', shapeBoardForm);
  shapeBoardForm();

  const registerKind = document.getElementById('register-kind');
  const registerForm = document.getElementById('register-form');
  const REGISTER_SHAPE = {
    expert:     ['expertise', 'credentials', 'region', 'availability'],
    opensource: ['github_username', 'interest']
  };

  function shapeRegisterForm() {
    const shown = REGISTER_SHAPE[registerKind.value];
    for (const label of registerForm.querySelectorAll('[data-rfield]')) {
      const field = label.dataset.rfield;
      const on = shown.includes(field);
      label.hidden = !on;
      if (!on) for (const input of label.querySelectorAll('input, textarea')) input.value = '';
    }
  }

  registerKind.addEventListener('change', shapeRegisterForm);
  shapeRegisterForm();

  const counter = document.getElementById('board-counter');
  const description = boardForm.querySelector('[name=description]');
  description.setAttribute('maxlength', String(MAX_TEXT));
  description.addEventListener('input', () => {
    counter.textContent = `${description.value.length} / ${MAX_TEXT}`;
  });

  const MESSAGES = {
    'link-not-http': 'Links need to start with http:// or https://.',
    'description-too-long': `That description is over the ${MAX_TEXT}-character limit.`,
    'github-username': "That doesn't look like a GitHub username.",
    'default': 'Please fill in every field shown.'
  };

  function wire(formId, statusId, map, action, validate, done) {
    const form = document.getElementById(formId);
    const status = document.getElementById(statusId);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const errors = validate(values);

      if (errors.length) {
        status.dataset.state = 'error';
        status.textContent = MESSAGES[errors.find((k) => k in MESSAGES)] ?? MESSAGES.default;
        return;
      }

      status.dataset.state = 'sending';
      status.textContent = 'Sending…';
      try {
        await submitTo(action, buildFormBody(values, map));
        form.reset();
        shapeBoardForm();
        shapeRegisterForm();
        counter.textContent = '';
        status.dataset.state = 'done';
        status.textContent = done;
      } catch {
        status.dataset.state = 'error';
        status.textContent = 'That did not go through. Please try again.';
      }
    });
  }

  wire('join-form', 'join-status', JOIN_MAP, JOIN_ACTION, validateJoin,
       "Thank you — that's been sent.");
  wire('board-form', 'board-status', BOARD_MAP, BOARD_ACTION, validateBoard,
       "Thank you — that's been sent. Posts appear on the board once reviewed.");
  wire('register-form', 'register-status', REGISTER_MAP, REGISTER_ACTION, validateRegister,
       "Thank you — that's been sent. Someone will be in touch.");
</script>
</body>
</html>
HTML
```

- [ ] **Step 2: Verify the page in a browser**

```bash
python3 -m http.server 8019 &
sleep 1
```

Open `http://localhost:8019/` and confirm each of these:

- The page has one drawn bounding box; each of the three fieldsets has its own drawn box.
- Changing **What is this?** to `Investment or expansion news` hides Presenter, When, Where and Public contact, and relabels Title to "Headline".
- Changing it to `Space for a startup` hides Title and relabels Where to "Where the space is".
- Changing **I want to** to `help build the open source software` swaps the four expert fields for the two open-source ones.
- Submitting the Join form with an empty Name shows "Please fill in every field shown." and does **not** clear the form.
- The console is clean.

Submissions themselves will fail or no-op until the Google Forms exist — that is expected at this stage.

- [ ] **Step 3: Verify the stale-value guard**

This is the subtle one. In the browser console:

```js
document.querySelector('[name=presenter]').value = 'Ghost';
document.getElementById('board-type').value = 'news';
document.getElementById('board-type').dispatchEvent(new Event('change'));
document.querySelector('[name=presenter]').value;
```

Expected: `''`. **If it returns `'Ghost'`**, hidden fields keep their values and a `news` post will carry a presenter into the Google Form — fix `shapeBoardForm` before continuing.

- [ ] **Step 4: Stop the server and commit**

```bash
kill %1
git add index.html
git commit -m "Build the one-pager with all three intake forms

One board form serves six post types by relabelling a stable field set —
the name attributes never change, only what the visitor reads. Hidden
fields are cleared on every switch, or a talk-turned-news would post a
presenter."
```

---

### Task 8: Shared Apps Script helpers and the Join processor

Apps Script projects can hold several `.gs` files that share one global scope. Putting the Kit and GitHub helpers in their own file means each of the three projects gets the same code by pasting two files instead of one, and there is a single place to fix a bug in it — rather than three copies drifting apart.

Google never reads this repo. These files are deployed by pasting.

**Files:**
- Create: `google-apps-script/_shared.gs`, `google-apps-script/join.gs`
- Modify: `google-apps-script/README.md`

**Interfaces:**
- Consumes: nothing from earlier tasks (Apps Script runs on Google's servers).
- Produces, in `_shared.gs`:
  - `var REPO`
  - `createIssue_(title, body, labels)`
  - `tagQuietly_(email, name, tagName)`
  - `findKitTag_(tagName, apiKey)`
  - `kitUpsertAndTag_(email, firstName, tagName, apiKey, formId)`
  - `assertProperties_()`
  - `pickFrom_(namedValues)` — returns a `pick(title)` closure

  Tasks 9's `board.gs` and `register.gs` call all of these.

- [ ] **Step 1: Write the shared helpers**

```bash
cat > google-apps-script/_shared.gs <<'GS'
/**
 * Shared helpers for every Niagara Assembly form processor.
 *
 * Apps Script files in one project share a single global scope, so this
 * file is pasted into each of the three projects ALONGSIDE its processor
 * (join.gs, board.gs or register.gs) rather than being duplicated inside
 * each of them. One place to fix a bug in the Kit client.
 *
 * Deploy: Sheet > Extensions > Apps Script > + > Script > name it
 * "_shared" > paste > Save.
 *
 * Script Properties required in every project:
 *   GITHUB_TOKEN  — fine-grained PAT, Issues: write on niagaraassembly/site
 *   KIT_API_KEY   — Kit v4 API key
 *   KIT_FORM_ID   — the double-opt-in form new subscribers are added through
 */

var REPO = 'niagaraassembly/site';
var MAX_TEXT = 2500;

/** Reads a form response by its QUESTION TITLE. Titles are the contract
 *  with docs/SETUP.md — a mistyped title yields an empty string, not an
 *  error, which is the silent failure this whole system is built to
 *  avoid. Change one here, change it there. */
function pickFrom_(namedValues) {
  return function (title) {
    var v = namedValues[title];
    return (v && v[0] ? v[0] : '').trim();
  };
}

function assertProperties_() {
  var props = PropertiesService.getScriptProperties();
  var names = ['GITHUB_TOKEN', 'KIT_API_KEY', 'KIT_FORM_ID'];
  for (var i = 0; i < names.length; i++) {
    if (!props.getProperty(names[i])) {
      throw new Error('FAIL: ' + names[i] + ' script property is not set');
    }
  }
  return props;
}

function createIssue_(title, body, labels) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  var response = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + '/issues', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({ title: title, body: body, labels: labels }),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() >= 300) {
    Logger.log('github: issue creation FAILED (HTTP %s): %s',
               response.getResponseCode(), response.getContentText());
  }
  return response;
}

/** Kit failures must never take down issue creation — the issue is the
 *  record of record; the mailing list can be reconciled by hand. */
function tagQuietly_(email, name, tagName) {
  try {
    var props = PropertiesService.getScriptProperties();
    kitUpsertAndTag_(email, name, tagName,
      props.getProperty('KIT_API_KEY'),
      props.getProperty('KIT_FORM_ID'));
    Logger.log('kit: tagged %s with "%s"', email, tagName);
  } catch (err) {
    Logger.log('kit: FAILED to tag %s with "%s" — %s', email, tagName, err.message);
  }
}

function findKitTag_(tagName, apiKey) {
  var wanted = tagName.toLowerCase();
  var url = 'https://api.kit.com/v4/tags?per_page=1000';

  while (url) {
    var response = UrlFetchApp.fetch(url, {
      headers: { 'X-Kit-Api-Key': apiKey },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) {
      throw new Error('Kit rejected the tags request (HTTP '
        + response.getResponseCode() + '): ' + response.getContentText());
    }
    var payload = JSON.parse(response.getContentText());
    var match = (payload.tags || []).filter(function (t) {
      return t.name.toLowerCase() === wanted;
    })[0];
    if (match) return match;

    var page = payload.pagination || {};
    url = (page.has_next_page && page.end_cursor)
      ? 'https://api.kit.com/v4/tags?per_page=1000&after=' + encodeURIComponent(page.end_cursor)
      : null;
  }
  return null;
}

function kitUpsertAndTag_(email, firstName, tagName, apiKey, formId) {
  if (!apiKey) throw new Error('KIT_API_KEY script property is not set.');
  if (!formId) throw new Error('KIT_FORM_ID script property is not set.');
  if (!email) throw new Error('No email captured for Kit.');

  UrlFetchApp.fetch('https://api.kit.com/v4/subscribers', {
    method: 'post', contentType: 'application/json',
    headers: { 'X-Kit-Api-Key': apiKey },
    payload: JSON.stringify({ email_address: email, first_name: firstName, state: 'inactive' }),
    muteHttpExceptions: true
  });

  /* Adding to the double-opt-in form is what makes Kit send its
     confirmation email. Everyone lands on the mailing list this way,
     whatever else they are tagged with. */
  UrlFetchApp.fetch('https://api.kit.com/v4/forms/' + formId + '/subscribers', {
    method: 'post', contentType: 'application/json',
    headers: { 'X-Kit-Api-Key': apiKey },
    payload: JSON.stringify({ email_address: email }),
    muteHttpExceptions: true
  });

  var match = findKitTag_(tagName, apiKey);
  if (!match) throw new Error('Kit has no tag named "' + tagName + '" — create it first.');

  UrlFetchApp.fetch('https://api.kit.com/v4/tags/' + match.id + '/subscribers', {
    method: 'post', contentType: 'application/json',
    headers: { 'X-Kit-Api-Key': apiKey },
    payload: JSON.stringify({ email_address: email }),
    muteHttpExceptions: true
  });
}
GS
```

- [ ] **Step 2: Write the Join processor**

```bash
cat > google-apps-script/join.gs <<'GS'
/**
 * Bound to the Join form's response Sheet. Paste alongside _shared.gs.
 *
 * Mailing list and membership interest. Nothing here becomes public, so
 * the issue carries no <!--DATA--> block and nothing labels it approved —
 * an admin follows up and closes it by hand.
 *
 * Install onFormSubmit as an INSTALLABLE trigger (Triggers > + Add
 * Trigger > onFormSubmit > From spreadsheet > On form submit). The simple
 * trigger of the same name cannot call UrlFetchApp at all.
 */

var LEVEL_TAGS = {
  List:     'na-list',
  Regional: 'na-member-regional',
  Company:  'na-member-company',
  Champion: 'na-member-champion'
};

function buildJoinBody(r) {
  var lines = [
    'Level: **' + r.level + '**',
    '',
    'Name: ' + r.name,
    'Email: ' + r.email,
    ''
  ];
  lines.push(r.level === 'List'
    ? 'Mailing list only. Nothing to do — close this.'
    : 'Membership interest. Follow up, then close this by hand. No label ' +
      'triggers anything on a join.');
  return lines.join('\n');
}

function onFormSubmit(e) {
  var pick = pickFrom_(e.namedValues);
  var r = { name: pick('Name'), email: pick('Email'), level: pick('Level') };

  if (!LEVEL_TAGS[r.level]) {
    Logger.log('join: unknown level "%s" — defaulting to List', r.level);
    r.level = 'List';
  }

  /* Unlike the board and register pipelines, name and email DO appear in
     this issue body. Nothing on a join is ever committed to a public file,
     so the issue is a private work item, not a staging area for one. */
  createIssue_('Join: ' + r.name + ' (' + r.level + ')', buildJoinBody(r), ['join']);
  tagQuietly_(r.email, r.name, LEVEL_TAGS[r.level]);
}

function runSelfTest() {
  var props = assertProperties_();
  var kitApiKey = props.getProperty('KIT_API_KEY');

  var body = buildJoinBody({ name: 'Rosa Silva', email: 'rosa@example.ca', level: 'Champion' });
  if (body.indexOf('Champion') === -1) throw new Error('FAIL: level not carried');
  if (body.indexOf('<!--DATA') !== -1) {
    throw new Error('FAIL: a join must not carry a data block — nothing here is published');
  }

  for (var level in LEVEL_TAGS) {
    if (!findKitTag_(LEVEL_TAGS[level], kitApiKey)) {
      throw new Error('FAIL: Kit tag "' + LEVEL_TAGS[level] + '" does not exist');
    }
  }

  Logger.log('RESULT: all checks passed');
}
GS
```

- [ ] **Step 3: Check both files parse as JavaScript**

Apps Script is ES5-era JavaScript, which `node --check` accepts. It cannot resolve `PropertiesService` or `UrlFetchApp`, but it catches the typo class that would otherwise only surface when a real person submits a form.

```bash
node --check google-apps-script/_shared.gs
node --check google-apps-script/join.gs
```

Expected: no output from either.

- [ ] **Step 4: Rewrite the deployment README**

```bash
cat > google-apps-script/README.md <<'MD'
# Apps Script processors

Google never reads this repository. Each file here is deployed by pasting
it into the Apps Script editor of the Sheet bound to its form.

| Project | Files to paste | Kit tags it needs |
|---|---|---|
| Join form's Sheet | `_shared.gs`, `join.gs` | `na-list`, `na-member-regional`, `na-member-company`, `na-member-champion` |
| Board form's Sheet | `_shared.gs`, `board.gs` | `na-board` |
| Register form's Sheet | `_shared.gs`, `register.gs` | `na-expert`, `na-opensource` |

Files in one Apps Script project share a global scope, which is why
`_shared.gs` is a second file in each project rather than three copies of
the same helpers.

## Deploying one project

1. Open the Sheet → **Extensions → Apps Script**
2. **+ → Script**, name it `_shared`, paste `_shared.gs`, **Save**
3. **+ → Script**, name it after the processor, paste it, **Save**
4. **Triggers → + Add Trigger** → function `onFormSubmit`, event source
   *From spreadsheet*, event type *On form submit*, **Save**.
   It must be an **installable** trigger — the simple trigger of the same
   name cannot call `UrlFetchApp` at all.
5. **Project Settings → Script Properties**: add `GITHUB_TOKEN`,
   `KIT_API_KEY`, `KIT_FORM_ID`
6. Run **`runSelfTest`** and confirm the log reads
   `RESULT: all checks passed`. Treat a failure as blocking.

On later edits, paste the new file and Save. The trigger binds to the
function *name* and always runs the currently saved code — it does not
need recreating.

## What runSelfTest guards

Every failure mode here is silent by nature: a mistyped question title
yields an empty string, not an error. `runSelfTest` turns the important
ones loud — Script Properties present, data block parses, Kit tags already
exist, and no private field can reach an issue body.
MD
```

- [ ] **Step 5: Commit**

```bash
git add google-apps-script/_shared.gs google-apps-script/join.gs google-apps-script/README.md
git commit -m "Share the Kit and GitHub helpers across all three processors

Apps Script files in one project share a global scope, so _shared.gs is
pasted as a second file in each project rather than triplicated inside
each processor.

join.gs is the one pipeline whose issue carries name and email: nothing
on a join is ever committed to a public file, so the issue is a private
work item rather than a staging area for one."
```

---

### Task 9: The Board and Register processors

The two processors whose issues feed the Action. Both must keep `name` and `email` out of their `<!--DATA-->` blocks — that block is the input to a public commit.

**Files:**
- Create: `google-apps-script/board.gs`, `google-apps-script/register.gs`

**Interfaces:**
- Consumes: `pickFrom_`, `createIssue_`, `tagQuietly_`, `findKitTag_`, `assertProperties_`, `MAX_TEXT`, `REPO` from `_shared.gs` (Task 8).
- Produces: `<!--DATA-->` blocks parsed by `extract_block` in `scripts/approve_request.py` (Task 3), and the `board` / `opensource` issue labels that Task 10's workflow jobs branch on.

- [ ] **Step 1: Write the Board processor**

```bash
cat > google-apps-script/board.gs <<'GS'
/**
 * Bound to the Board form's response Sheet. Paste alongside _shared.gs.
 *
 * One form serves six post types. The Google Form has NO required
 * questions — a `news` post has no `When`, and a required question would
 * reject it — so the browser validates in assets/js/submit.js and
 * scripts/approve_request.py validates again before anything is committed.
 * This script is transport between the two, and deliberately does not add
 * a third opinion about which fields a type needs.
 *
 * What it IS responsible for: keeping name and email out of the data
 * block. That block is the input to a public commit in a public repo with
 * permanent history.
 */

var KIT_TAG_BOARD = 'na-board';
var BOARD_TYPES = ['standup', 'talk', 'demo', 'space', 'news', 'idea'];

/* Public fields only. name and email are captured for follow-up and Kit
   and appear nowhere below. */
function buildBoardBody(r) {
  var data = {
    kind: r.type,
    title: r.title,
    presenter: r.presenter,
    when: r.when,
    where: r.where,
    description: (r.description || '').slice(0, MAX_TEXT),
    link: r.link,
    contact: r.contact
  };

  /* Drop empties so the block stays readable for whoever reviews it —
     approve_request.py ignores absent keys anyway. */
  for (var k in data) if (!data[k]) delete data[k];

  return 'A ' + r.type + ' was posted by ' + r.name + '.\n\n' +
         '**`approved`** — add this label to publish it to the board.\n' +
         'Nothing else publishes it, and nothing publishes automatically.\n\n' +
         'Submitter (not published): ' + r.name + ' <' + r.email + '>\n\n' +
         '<!--DATA\n' + JSON.stringify(data, null, 1) + '\nDATA-->';
}

function onFormSubmit(e) {
  var pick = pickFrom_(e.namedValues);
  var r = {
    type: pick('Type'), name: pick('Name'), email: pick('Email'),
    title: pick('Title'), presenter: pick('Presenter'), when: pick('When'),
    where: pick('Where'), description: pick('Description'),
    link: pick('Link'), contact: pick('Contact')
  };

  if (BOARD_TYPES.indexOf(r.type) === -1) {
    Logger.log('board: unknown type "%s" — creating an issue anyway for triage', r.type);
  }

  var headline = r.title || r.where || '(untitled)';
  createIssue_(r.type + ': ' + headline, buildBoardBody(r), ['board']);
  tagQuietly_(r.email, r.name, KIT_TAG_BOARD);
}

function runSelfTest() {
  var props = assertProperties_();

  var body = buildBoardBody({
    type: 'news', name: 'Rosa Silva', email: 'rosa@example.ca',
    title: 'Plant reopens in Thorold', link: 'https://example.ca/thorold',
    description: 'Two hundred jobs.'
  });

  var m = body.match(/<!--DATA\s*([\s\S]*?)\s*DATA-->/);
  if (!m) throw new Error('FAIL: no data block');
  var parsed = JSON.parse(m[1]);

  if (parsed.kind !== 'news') throw new Error('FAIL: wrong kind');
  if (parsed.title !== 'Plant reopens in Thorold') throw new Error('FAIL: title not carried');
  if ('email' in parsed) throw new Error('FAIL: email must never enter the data block');
  if ('name' in parsed) throw new Error('FAIL: name must never enter the data block');
  if ('when' in parsed) throw new Error('FAIL: empty fields must be dropped, not sent blank');

  if (!findKitTag_(KIT_TAG_BOARD, props.getProperty('KIT_API_KEY'))) {
    throw new Error('FAIL: Kit tag "' + KIT_TAG_BOARD + '" does not exist');
  }

  Logger.log('RESULT: all checks passed');
}
GS
```

- [ ] **Step 2: Write the Register processor**

```bash
cat > google-apps-script/register.gs <<'GS'
/**
 * Bound to the Register form's response Sheet. Paste alongside _shared.gs.
 *
 * Two kinds, neither published:
 *
 *   expert     — an inbox item with a Kit tag. No data block, no label
 *                triggers anything. An admin follows up and closes it.
 *   opensource — carries a data block whose ONLY key is github_username.
 *                On `approved`, the Action invites them to the org.
 *
 * The open-source block is deliberately minimal. It is read by a workflow
 * that interpolates its value into a shell command, so the less it
 * carries, the smaller the surface. The username is validated here as
 * well as in the browser and in the workflow.
 */

var KIT_TAG_EXPERT = 'na-expert';
var KIT_TAG_OPENSOURCE = 'na-opensource';

/* GitHub's own rule: alphanumeric, single interior hyphens, 39 max. */
var GH_USER = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

function buildExpertBody(r) {
  return [
    'Expertise: ' + r.expertise,
    'Region: ' + r.region,
    'Credentials: ' + (r.credentials || '—'),
    'Availability: ' + (r.availability || '—'),
    '',
    'Name: ' + r.name,
    'Email: ' + r.email,
    '',
    'Nothing here is published. Follow up, then close this by hand.'
  ].join('\n');
}

function buildOpenSourceBody(r) {
  var valid = GH_USER.test(r.github_username);
  var data = { kind: 'opensource', github_username: r.github_username };

  return [
    (valid ? '' : '**The username below does not look valid — check it before approving.**\n'),
    'GitHub: @' + r.github_username,
    '',
    'Name: ' + r.name,
    'Email: ' + r.email,
    'Wants to work on: ' + (r.interest || '—'),
    '',
    '**`approved`** — add this label to invite them to the niagaraassembly org.',
    '',
    '<!--DATA',
    JSON.stringify(data, null, 1),
    'DATA-->'
  ].join('\n');
}

function onFormSubmit(e) {
  var pick = pickFrom_(e.namedValues);
  var r = {
    kind: pick('Kind'), name: pick('Name'), email: pick('Email'),
    expertise: pick('Expertise'), credentials: pick('Credentials'),
    region: pick('Region'), availability: pick('Availability'),
    github_username: pick('GitHub username'), interest: pick('Interest')
  };

  if (r.kind === 'opensource') {
    createIssue_('Open source: @' + r.github_username, buildOpenSourceBody(r), ['opensource']);
    tagQuietly_(r.email, r.name, KIT_TAG_OPENSOURCE);
    return;
  }

  /* Anything that is not explicitly opensource is treated as an expert
     registration rather than dropped — a mistyped Kind must not lose a
     real person's details. */
  if (r.kind !== 'expert') Logger.log('register: unexpected kind "%s" — filing as expert', r.kind);
  createIssue_('Expert: ' + r.name + ' — ' + r.expertise, buildExpertBody(r), ['expert']);
  tagQuietly_(r.email, r.name, KIT_TAG_EXPERT);
}

function runSelfTest() {
  var props = assertProperties_();
  var kitApiKey = props.getProperty('KIT_API_KEY');

  var expert = buildExpertBody({ name: 'Rosa Silva', email: 'rosa@example.ca',
                                 expertise: 'IPC-A-610', region: 'Niagara' });
  if (expert.indexOf('<!--DATA') !== -1) {
    throw new Error('FAIL: an expert registration must not carry a data block');
  }

  var oss = buildOpenSourceBody({ name: 'Rosa Silva', email: 'rosa@example.ca',
                                  github_username: 'rosa-silva', interest: 'Maps' });
  var m = oss.match(/<!--DATA\s*([\s\S]*?)\s*DATA-->/);
  if (!m) throw new Error('FAIL: no data block on the open-source body');
  var parsed = JSON.parse(m[1]);

  if (parsed.github_username !== 'rosa-silva') throw new Error('FAIL: username not carried');
  if ('email' in parsed) throw new Error('FAIL: email must never enter the data block');
  if ('name' in parsed) throw new Error('FAIL: name must never enter the data block');
  var keys = Object.keys(parsed).sort().join(',');
  if (keys !== 'github_username,kind') {
    throw new Error('FAIL: the open-source block must carry nothing but kind and ' +
                    'github_username — found: ' + keys);
  }

  if (!GH_USER.test('rosa-silva')) throw new Error('FAIL: valid username rejected');
  if (GH_USER.test('rosa silva')) throw new Error('FAIL: invalid username accepted');

  if (!findKitTag_(KIT_TAG_EXPERT, kitApiKey)) {
    throw new Error('FAIL: Kit tag "' + KIT_TAG_EXPERT + '" does not exist');
  }
  if (!findKitTag_(KIT_TAG_OPENSOURCE, kitApiKey)) {
    throw new Error('FAIL: Kit tag "' + KIT_TAG_OPENSOURCE + '" does not exist');
  }

  Logger.log('RESULT: all checks passed');
}
GS
```

- [ ] **Step 3: Check both files parse**

```bash
node --check google-apps-script/board.gs
node --check google-apps-script/register.gs
```

Expected: no output.

- [ ] **Step 4: Verify a board data block survives the round trip**

The Apps Script and the Python script agree on a format that neither one tests against the other. Check it directly, using the actual body-builder logic:

```bash
node -e '
var MAX_TEXT = 2500;
' -e "$(sed -n '/^function buildBoardBody/,/^}/p' google-apps-script/board.gs)" -e '
var body = buildBoardBody({ type: "standup", name: "Rosa Silva", email: "rosa@example.ca",
  title: "Open bench night", when: "Thursday 7pm", where: "12 Ross St",
  contact: "rosa@example.ca" });
process.stdout.write(body);
' > /tmp/na-issue-body.txt

ISSUE_BODY="$(cat /tmp/na-issue-body.txt)" python3 - <<'PY'
import os, sys
sys.path.insert(0, "scripts")
import approve_request as ar
rec = ar.extract_block(os.environ["ISSUE_BODY"])
assert ar.validate(rec) == [], ar.validate(rec)
assert "email" not in rec and "name" not in rec, rec
print("round trip OK:", rec)
PY
```

Expected: `round trip OK: {'kind': 'standup', ...}` with no `name` and no `email` key.

**If `validate` returns errors**, the two files disagree about field names — reconcile them before continuing. This is the single most likely place for a silent mismatch to hide.

- [ ] **Step 5: Commit**

```bash
rm -f /tmp/na-issue-body.txt
git add google-apps-script/board.gs google-apps-script/register.gs
git commit -m "Add the Board and Register processors

Both keep name and email out of the data block: that block is the input
to a public commit in a repo with permanent history.

board.gs is deliberately transport only — the browser and the Python
script are the two validation gates, and a third opinion here would be a
third place for the field lists to drift.

The open-source block carries kind and github_username and nothing else;
runSelfTest asserts the key set exactly, because that value is
interpolated into a shell command by the workflow."
```

---

### Task 10: The workflow, and the documentation

Split the Action into two jobs and rewrite the two documents an operator reads.

The invite job needs a token the workflow does not have by default: **`GITHUB_TOKEN` in Actions cannot invite organization members.** It 403s. This is the failure that happens with a real person waiting on an invitation, so the job checks for the secret and says so plainly rather than failing on the API call.

**Files:**
- Modify: `.github/workflows/approve-request.yml`, `docs/SETUP.md`, `README.md`

**Interfaces:**
- Consumes: `scripts/approve_request.py` (Task 3), the `board` and `opensource` labels from Task 9.
- Produces: nothing later tasks consume — this is the last task.

- [ ] **Step 1: Rewrite the workflow**

```bash
cat > .github/workflows/approve-request.yml <<'YML'
# Fires when a label is added to an issue. Two independent jobs, each
# gated on the issue also carrying its pipeline's label — so approving a
# board post never touches the org, and approving an open-source
# registration never touches data/.
#
# On the `issues` event, actions/checkout@v4 checks out the repository's
# DEFAULT branch, not any feature branch. This workflow writes to whatever
# branch is default at run time, so it is only live once this work has
# been merged there.
name: Approve request
on:
  issues:
    types: [labeled]
permissions:
  contents: write
  issues: write

jobs:
  write:
    name: Publish to the board
    if: >-
      github.event.label.name == 'approved' &&
      contains(github.event.issue.labels.*.name, 'board')
    runs-on: ubuntu-latest
    concurrency:
      group: write-data
      # Never cancel an in-flight write: cancelling mid-run would drop the
      # very record it was in the middle of committing.
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4

      - name: Write, commit and push
        env:
          ISSUE_BODY: ${{ github.event.issue.body }}
        run: |
          git config user.name "niagara-assembly-bot"
          git config user.email "noreply@niagaraassembly.com"
          for attempt in 1 2 3 4 5; do
            git fetch origin "$GITHUB_REF_NAME"
            git reset --hard "origin/$GITHUB_REF_NAME"
            python3 scripts/approve_request.py || exit 1
            git add data/
            if git diff --staged --quiet; then exit 0; fi
            git commit -m "Add board record from #${{ github.event.issue.number }}"
            if git push; then exit 0; fi
            echo "push rejected; re-deriving against latest (attempt $attempt)"
            sleep $((RANDOM % 5 + 2))
          done
          echo "could not push after 5 attempts" >&2
          exit 1

      - name: Say what happened, then close
        if: always()
        env:
          GH_TOKEN: ${{ github.token }}
          RESULT: ${{ job.status }}
        run: |
          if [ "$RESULT" = "success" ]; then
            gh issue comment ${{ github.event.issue.number }} \
              --repo ${{ github.repository }} \
              --body "Published to the board."
            gh issue close ${{ github.event.issue.number }} \
              --repo ${{ github.repository }}
          else
            gh issue comment ${{ github.event.issue.number }} \
              --repo ${{ github.repository }} \
              --body "Publishing failed — see the run log. The issue stays open."
          fi

  invite:
    name: Invite to the organization
    if: >-
      github.event.label.name == 'approved' &&
      contains(github.event.issue.labels.*.name, 'opensource')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Invite
        env:
          ISSUE_BODY: ${{ github.event.issue.body }}
          # NOT github.token. The Actions token cannot invite org members;
          # it returns 403. This is a fine-grained PAT with organization
          # permission "Members: Read and write", created by an org owner
          # and stored as a repository secret.
          GH_TOKEN: ${{ secrets.ORG_INVITE_TOKEN }}
          COMMENT_TOKEN: ${{ github.token }}
        run: |
          set -euo pipefail

          if [ -z "${GH_TOKEN:-}" ]; then
            echo "ORG_INVITE_TOKEN is not set on this repository." >&2
            echo "The default Actions token cannot invite organization members." >&2
            exit 1
          fi

          USERNAME="$(python3 - <<'PY'
          import os, sys
          sys.path.insert(0, "scripts")
          from approve_request import extract_block
          print(extract_block(os.environ["ISSUE_BODY"]).get("github_username", ""))
          PY
          )"

          # Validated a third time. The browser check is advice, the Apps
          # Script check is advice, and this value reaches a command line.
          if ! printf '%s' "$USERNAME" | grep -qE '^[A-Za-z0-9]([A-Za-z0-9]|-[A-Za-z0-9]){0,38}$'; then
            echo "refusing to invite: '$USERNAME' is not a valid GitHub username" >&2
            exit 1
          fi

          gh api --method PUT "orgs/niagaraassembly/memberships/${USERNAME}" -f role=member

      - name: Say what happened, then close
        if: always()
        env:
          GH_TOKEN: ${{ github.token }}
          RESULT: ${{ job.status }}
        run: |
          if [ "$RESULT" = "success" ]; then
            gh issue comment ${{ github.event.issue.number }} \
              --repo ${{ github.repository }} \
              --body "Organization invitation sent."
            gh issue close ${{ github.event.issue.number }} \
              --repo ${{ github.repository }}
          else
            gh issue comment ${{ github.event.issue.number }} \
              --repo ${{ github.repository }} \
              --body "Invitation failed — see the run log. The issue stays open."
          fi
YML
```

- [ ] **Step 2: Validate the workflow YAML**

```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/approve-request.yml')); print('YAML OK')"
```

Expected: `YAML OK`. If PyYAML is not installed, `pip install pyyaml` or skip — GitHub will report a parse error on push, but catching it here is cheaper.

- [ ] **Step 3: Rewrite the setup runbook**

```bash
cat > docs/SETUP.md <<'MD'
# Setup runbook

Everything in this repo is code. None of the accounts it talks to exist
yet, so no submission goes anywhere until the steps below are done. Work
them in order — each one depends on the last.

**Whoever does this needs:** a Google account, ownership of the
`niagaraassembly` GitHub organization, and the Kit account that owns the
mailing list.

> **The failure mode to watch for.** Almost every mistake here fails
> *silently* rather than loudly. A mistyped Google Form question title does
> not error — the field simply arrives empty and an issue is created with a
> blank in it. Run the verification in §8 rather than assuming a green form
> submission means the chain worked.

---

## 1. Kit

Create **seven** tags, spelled exactly:

`na-list`, `na-member-regional`, `na-member-company`, `na-member-champion`,
`na-board`, `na-expert`, `na-opensource`

Do this first. `runSelfTest` in §7 fails if a tag does not already exist,
and that check is deliberate — a script that silently invented tags would
scatter near-duplicates through the list.

You will also need, from Kit:

- **API key** (v4 — the scripts send it as the `X-Kit-Api-Key` header)
- **Form ID** — the double-opt-in form new subscribers are added through.
  Adding a subscriber to it is what makes Kit send its confirmation email.

---

## 2. GitHub

Create the organization `niagaraassembly` and a **public** repository
`site` inside it. That exact string is `var REPO` in
`google-apps-script/_shared.gs`.

**Create five labels:**

| Label | Effect |
|---|---|
| `approved` | **The gate.** Triggers the Action. |
| `board` | Applied by `board.gs`. Selects the publish job. |
| `opensource` | Applied by `register.gs`. Selects the invite job. |
| `join` | Applied by `join.gs`. Organisational only — nothing automatic. |
| `expert` | Applied by `register.gs`. Organisational only. |

**Settings → Pages:** serve from the default branch, root. `.nojekyll` and
`CNAME` are already committed.

> The Action checks out the **default branch** on an `issues` event. Until
> this work is merged there, the pipeline is inert even once everything
> else is set up.

---

## 3. Two tokens

They are not interchangeable and they live in different places.

| Token | Permissions | Where it goes |
|---|---|---|
| Issue token | Fine-grained PAT, `Issues: write` on `niagaraassembly/site` only | Apps Script **Script Property** `GITHUB_TOKEN`, in all three projects |
| Org invite token | Fine-grained PAT, organization permission `Members: Read and write`, created by an **org owner** | Repository **secret** `ORG_INVITE_TOKEN` |

Neither is ever a value in this repository.

> **Why two.** The workflow's own `github.token` can write files and
> comment on issues, but it **cannot invite organization members** — that
> call returns 403. The invite job checks for `ORG_INVITE_TOKEN` up front
> and fails with that explanation rather than on the API call, because the
> failure happens with a real person waiting on an invitation.

---

## 4. Three Google Forms

The Apps Script reads each response by its **question title**, so these
must match character for character, including spaces and capitalisation.
A mismatch is the silent failure described above.

### Join form

| Question title | Type | Required |
|---|---|---|
| `Name` | Short answer | yes |
| `Email` | Short answer | yes |
| `Level` | Multiple choice — `List`, `Regional`, `Company`, `Champion` | yes |

### Board form

| Question title | Type |
|---|---|
| `Type` | Multiple choice — `standup`, `talk`, `demo`, `space`, `news`, `idea` |
| `Name` | Short answer |
| `Email` | Short answer |
| `Title` | Short answer |
| `Presenter` | Short answer |
| `When` | Short answer |
| `Where` | Short answer |
| `Description` | Paragraph |
| `Link` | Short answer |
| `Contact` | Short answer |

> **Mark NOTHING on this form required.** A `news` post has no `When`; a
> required `When` question rejects it. The page posts `no-cors` and cannot
> see the rejection, so the submission would simply vanish. Validation
> lives in `assets/js/submit.js` and again in `scripts/approve_request.py`.

### Register form

| Question title | Type |
|---|---|
| `Kind` | Multiple choice — `expert`, `opensource` |
| `Name` | Short answer |
| `Email` | Short answer |
| `Expertise` | Short answer |
| `Credentials` | Short answer |
| `Region` | Short answer |
| `Availability` | Short answer |
| `GitHub username` | Short answer |
| `Interest` | Paragraph |

Same rule: nothing required, because an expert has no GitHub username.

On each form: **Responses → Link to Sheets** → create a new spreadsheet.
The Apps Script is bound to that Sheet, not to the form.

> To re-derive the title list for any script at any time:
> ```bash
> grep -o "pick('[^']*')" google-apps-script/board.gs
> ```

---

## 5. Wire the page to the forms

`index.html` posts every field to the literal string `entry.0`, at the
literal URLs `FORM_URL_JOIN`, `FORM_URL_BOARD` and `FORM_URL_REGISTER`.
All are placeholders.

**Get each form action URL:** open the live form (the `/viewform` URL),
view source, take the `<form action="...">` — it ends in `/formResponse`.

**Get the `entry.*` ids:** in that same page source find
`FB_PUBLIC_LOAD_DATA_`. Each question appears with its numeric id; the
field name is `entry.<id>`.

**Do not** derive ids from a pre-filled-link URL. That method produces ids
that look right and silently drop values for some question types.

The left-hand keys in each `*_MAP` are the HTML `name` attributes and must
not change; only the `entry.*` values do.

---

## 6. Apps Script — properties

For **each** of the three bound Sheets: **Extensions → Apps Script →
Project Settings → Script Properties**, and add all three:

| Property | Value |
|---|---|
| `GITHUB_TOKEN` | the issue token from §3 |
| `KIT_API_KEY` | from §1 |
| `KIT_FORM_ID` | from §1 |

All three projects need all three. Nothing here is ever stored in this
repository.

---

## 7. Apps Script — deploy

See `google-apps-script/README.md` for the per-project steps. In short:
paste `_shared.gs` and the project's processor as two files, add the
installable `onFormSubmit` trigger, run `runSelfTest`, confirm the log
reads `RESULT: all checks passed`. Treat a failure as blocking.

---

## 8. Verify the whole chain

Do this once, end to end, before announcing the site.

**Join**
1. Submit the Join form as `Champion`.
2. Kit: confirm you were added and tagged `na-member-champion`.
3. GitHub: confirm a `join` issue appeared. Nothing else should happen —
   there is no data block and no label does anything.

**Board**
4. Submit the Board form as a `news` post. Confirm it succeeds — this is
   the case a required `When` question would have silently eaten.
5. GitHub: open the issue. **Check the `<!--DATA … -->` block contains no
   `name` and no `email`.** It must not.
6. Add the `approved` label. The Action runs. Confirm `data/board.json`
   gains the record, the issue is commented on and closed, and the record
   carries neither name nor email.
7. Load `niagaraassembly.com/board` and confirm the post appears under
   **News** with a drawn border.
8. Repeat with a `standup` post and confirm both appear under their own
   headings.

**Register**
9. Submit the Register form as `expert`. Confirm the Kit tag and the
   `expert` issue. Nothing else should happen.
10. Submit as `opensource` with your own GitHub username. Add `approved`.
    Confirm you receive an organization invitation and the issue is
    commented on and closed.

If step 5 or 6 shows an email in the JSON, stop and fix it before anything
else. The repository is public and git history is permanent — a leak
survives its own deletion.

---

## 9. Known gaps at first launch

- **No spam filtering.** The `approved` label is the only thing between a
  public form and a public page. Bot filters are deliberately deferred
  until there is real spam to pattern-match against; the approval gate
  holds the line until then.
- **The `approved` label is an editorial gate, not a security control.**
  Every value rendered from `data/board.json` is escaped on the page for
  that reason — see `assets/js/escape.js`.
- **The invite job has never run.** §8 step 10 is its first execution.
- **Expert registrations go nowhere automatic.** They are an inbox with a
  Kit tag until someone works them.

---

## Quick reference

```bash
python3 -m http.server 8019             # run the site locally
node --test tests/*.test.mjs            # JS suite
python3 -m unittest discover -s tests   # Python suite
```

| Where a thing lives | |
|---|---|
| Form question titles | `google-apps-script/*.gs`, the `pick('…')` calls |
| Form endpoints and field ids | `index.html`, `*_ACTION` and `*_MAP` |
| Target repo | `var REPO` in `google-apps-script/_shared.gs` |
| Kit tag names | `LEVEL_TAGS` and `KIT_TAG_*` in the processors |
| Which fields are public | `PUBLIC` in `scripts/approve_request.py` |
| Which fields each type needs | `BOARD_REQUIRED` in `assets/js/submit.js`, mirrored by `REQUIRED` in `scripts/approve_request.py` |
| Credentials | Apps Script Script Properties and the `ORG_INVITE_TOKEN` repo secret — never this repo |
MD
```

- [ ] **Step 4: Rewrite the README**

```bash
cat > README.md <<'MD'
# Niagara Assembly

Buildless static site for `niagaraassembly.com`. No dependencies, no build
step, no server.

```bash
python3 -m http.server 8019     # then open http://localhost:8019
node --test tests/*.test.mjs
python3 -m unittest discover -s tests
```

## What is here

| | |
|---|---|
| `index.html` | the one-pager, and all three intake forms |
| `board/index.html` | the public board, served at `/board` |
| `data/board.json` | public; written **only** by the approval workflow |
| `google-apps-script/` | form processors, deployed by pasting into Google |
| `extra-docs/` | the statement the site opened with, kept for reference |

## Three pipelines

```text
Join       form -> Google Form -> Sheet -> Apps Script -> Kit tag + Issue (join)
Board      form -> Google Form -> Sheet -> Apps Script -> Kit tag + Issue (board)
Register   form -> Google Form -> Sheet -> Apps Script -> Kit tag + Issue (expert|opensource)

approved + board      -> Action -> scripts/approve_request.py -> data/board.json
approved + opensource -> Action -> GitHub org invitation
```

Only the board publishes anything. Joins and expert registrations are
private work items an admin closes by hand.

**Nothing is connected yet.** No Google Forms, GitHub organization, or Kit
credentials exist — see [docs/SETUP.md](docs/SETUP.md) for the ordered
runbook that wires it up.

## Two rules the code enforces

**`name` and `email` are never public.** They appear in no `<!--DATA-->`
block on a publishing pipeline, in no `PUBLIC` list, and in no committed
JSON. `runSelfTest` in each processor asserts this, and
`tests/test_approve_request.py` asserts it again at the last gate before a
commit.

**The `approved` label is an editorial gate, not a security control.** It
catches defamation and spam, not script injection. Everything rendered
from `data/board.json` is escaped at the point of interpolation — see
`assets/js/escape.js`.
MD
```

- [ ] **Step 5: Run everything one last time**

```bash
node --test tests/*.test.mjs
python3 -m unittest discover -s tests
for f in google-apps-script/*.gs; do node --check "$f" || echo "PARSE FAIL: $f"; done
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/approve-request.yml')); print('YAML OK')"
grep -rn "endorsement\|meetup\|PatonSketch\|publish-comment" --include=*.js --include=*.py --include=*.html --include=*.gs --include=*.yml . | grep -v extra-docs
```

Expected: both suites pass, every `.gs` parses, `YAML OK`, and the final
grep prints **nothing**. Any hit is a reference to something Task 1
deleted.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/approve-request.yml docs/SETUP.md README.md
git commit -m "Split the Action into publish and invite jobs, rewrite the docs

The invite job needs its own token: the default Actions token cannot
invite organization members and returns 403. It checks for the secret up
front and says so, because that failure happens with a real person
waiting on an invitation.

Both jobs now comment their outcome back on the issue. A silent Action is
the same failure mode as a silent form.

The username reaching the shell is validated a third time here — the
browser and Apps Script checks are advice; this one is the boundary."
```

---

## Post-implementation

Everything above is code. Nothing works until the operator completes
`docs/SETUP.md` §1–§7, which requires accounts this plan cannot create.
§8's end-to-end verification is the first real execution of the Action,
the invite job, and every Apps Script trigger.
