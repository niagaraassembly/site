# Setup runbook

Everything in this repo is code. None of the accounts it talks to exist yet, so
no submission goes anywhere until the steps below are done. Work them in order —
each one depends on the last.

**Whoever does this needs:** a Google account, a GitHub account, and the Kit
account that owns the mailing list.

> **The failure mode to watch for.** Almost every mistake here fails *silently*
> rather than loudly. A mistyped Google Form question name does not error — the
> field simply arrives empty and an issue is created with a blank in it. Run the
> verification in §7 rather than assuming a green form submission means the chain
> worked.

---

## 1. Kit tags

Create two tags in Kit, spelled exactly:

- `niagara-endorsement`
- `niagara-meetup`

Do this first. `runSelfTest` in §6 fails if a tag does not already exist, and
that check is deliberate — a script that silently invents tags would scatter
near-duplicates through the list.

You will also need, from Kit:

- **API key** (v4 API — the scripts send it as the `X-Kit-Api-Key` header)
- **Form ID** — the Kit form new subscribers are added through

---

## 2. Google Forms

Create **two** forms. The Apps Script reads each response by its **question
title**, so these must match character for character, including spaces and
slashes. A mismatch is the silent failure described above.

### Endorse form

| Question title | Type | Required |
|---|---|---|
| `Name` | Short answer | yes |
| `Email` | Short answer | yes |
| `City / Town / Township` | Short answer | yes |
| `Trade / Expertise` | Short answer | yes |
| `Comment` | Paragraph | no |

### Meetup form

| Question title | Type | Required |
|---|---|---|
| `Name` | Short answer | yes |
| `Email` | Short answer | yes |
| `What` | Short answer | yes |
| `When` | Short answer | yes |
| `Where` | Short answer | yes |
| `Contact` | Short answer | yes |
| `Calendar link` | Short answer | no |

On each form: **Responses → Link to Sheets** → create a new spreadsheet. The
Apps Script is bound to that Sheet, not to the form.

> These titles are the contract with `google-apps-script/*.gs`. If you change one
> here, change the matching `pick('…')` call in the script. To re-derive the list
> at any time:
> ```bash
> grep -o "pick('[^']*')" google-apps-script/endorse.gs
> ```

---

## 3. Wire the site to the forms

`index.html` currently posts every field to the literal string `entry.0`, at the
literal URL `FORM_URL_ENDORSE`. Both are placeholders. Replace them with the real
values.

**Get the form action URL:** open the live form (the `/viewform` URL), view
source, and take the `<form action="...">` — it ends in `/formResponse`.

**Get the `entry.*` ids:** in that same page source, find `FB_PUBLIC_LOAD_DATA_`.
Each question appears with its numeric id; the field name is `entry.<id>`.

**Do not** derive ids from a pre-filled-link URL. That method produces ids that
look right and silently drop values for some question types.

Then edit `index.html`:

```js
const ENDORSE_ACTION = 'https://docs.google.com/forms/d/e/…/formResponse';
const ENDORSE_MAP = { name:'entry.…', email:'entry.…', location:'entry.…',
                      trade:'entry.…', comment:'entry.…' };
const MEETUP_ACTION = 'https://docs.google.com/forms/d/e/…/formResponse';
const MEETUP_MAP = { name:'entry.…', email:'entry.…', title:'entry.…',
                     starts:'entry.…', venue:'entry.…', contact:'entry.…',
                     calendar_url:'entry.…' };
```

The left-hand keys are the HTML `name` attributes and must not change; only the
`entry.*` values do.

---

## 4. GitHub repository

Both scripts post issues to `niagaraassembly/site` (see `var REPO` at the top of
each `.gs`). Create that org and repo, or change the constant.

**Create three labels** — the pipeline keys off them:

| Label | Effect |
|---|---|
| `approved` | Triggers the Action that writes the record. **This is the gate.** |
| `publish-comment` | On an endorsement, also publishes the comment text. Without it, the person joins the roster and their comment is withheld. |
| `endorsement` / `meetup` | Applied automatically by the scripts. Organisational only. |

**Create a fine-grained personal access token** with `Issues: write` on that repo
only. This is the `GITHUB_TOKEN` in §5 — it is a Script Property in Google, never
a value in this repo.

**Settings → Pages:** serve from the default branch, root. `.nojekyll` and
`CNAME` are already committed. Point `niagaraassembly.com`'s DNS at GitHub Pages.

> The Action checks out the **default branch** on an `issues` event. Until this
> work is merged there, the pipeline is inert even once everything else is set up.

---

## 5. Apps Script — properties

For **each** of the two bound Sheets: **Extensions → Apps Script → Project
Settings → Script Properties**, and add all three:

| Property | Value |
|---|---|
| `GITHUB_TOKEN` | the token from §4 |
| `KIT_API_KEY` | from §1 |
| `KIT_FORM_ID` | from §1 |

Both scripts need all three. Nothing here is ever stored in this repository.

---

## 6. Apps Script — deploy

Google never reads this repo. Each `.gs` is deployed by pasting.

For each form's Sheet:

1. **Extensions → Apps Script**
2. Select all, paste the whole contents of `google-apps-script/endorse.gs`
   (or `meetup.gs` for the other), **Save**
3. **Triggers → Add Trigger** → function `onFormSubmit`, event source *From
   spreadsheet*, event type *On form submit*
4. Run **`runSelfTest`** and confirm the log reads `RESULT: all checks passed`

`runSelfTest` verifies all three Script Properties are set, that the data block
parses, that the Kit tag from §1 exists, and that no private field can reach the
issue body. Treat a failure as blocking.

**On later edits:** paste the new file and Save. The trigger binds to the
function *name* and always runs the currently saved code — it does not need
re-creating.

---

## 7. Verify the whole chain

Do this once, end to end, before announcing the site.

1. Submit the **endorse form** yourself with a comment.
2. Kit: confirm you were added and tagged `niagara-endorsement`.
3. GitHub: confirm an issue appeared. **Open it and check the `<!--DATA … -->`
   block contains no `email` field.** It must not.
4. Add the `approved` label **only**. The Action runs; confirm
   `data/endorsements.json` gains your record with **no comment** and **no
   email**.
5. Add `publish-comment` and re-apply `approved`. Confirm the comment appears.
6. Load the site, open **Endorsements**, confirm you appear under both *Voices*
   and *Everyone*.
7. Repeat with the **meetup form**. Confirm the record carries `contact` but
   **not** your name or email, and that the band and drawer show it.

If step 3 or 4 shows an email in the JSON, stop and fix it before anything else.
The repository is public and git history is permanent — a leak survives its own
deletion.

---

## 8. Known gaps at first launch

- **The Action has never run.** Its concurrency group and retry loop were
  verified by inspection and by local YAML/bash validation only. §7 step 4 is the
  first real execution.
- **No spam filtering.** The `approved` label is the only thing between a public
  form and a public page. Bot filters are deliberately deferred until there is
  real spam to pattern-match against; the approval gate holds the line until then.
- **The `approved` label is an editorial gate, not a security control.** Every
  value rendered from `data/*.json` is escaped on the page for that reason —
  see `assets/js/escape.js`.
- **Desktop-first.** The layout does not break on a phone, but it was not
  designed there, and the statement is meant to be forwarded and read on one.

---

## Quick reference

```bash
python3 -m http.server 8019        # run the site locally
node --test tests/                 # JS suite
python3 -m unittest discover -s tests   # Python suite
```

| Where a thing lives | |
|---|---|
| Form question titles | `google-apps-script/*.gs`, the `pick('…')` calls |
| Form endpoints and field ids | `index.html`, `*_ACTION` and `*_MAP` |
| Target repo | `var REPO` in both `.gs` files |
| Kit tag names | `KIT_TAG_*` in both `.gs` files |
| Which fields are public | `PUBLIC` in `scripts/approve_request.py` |
| Credentials | Apps Script Script Properties only — never this repo |
