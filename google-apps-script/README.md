# Google Apps Script processors

Two scripts, one per form: `endorse.gs` (the Endorse form) and `meetup.gs`
(the Meetup form). Each turns a form submission into a GitHub Issue carrying
a `<!--DATA … DATA-->` block that `scripts/approve_request.py` parses once
an editor labels the issue `approved` (and, for endorsements, optionally
`publish-comment`).

**Google never reads this repo.** These files are version-controlled here
for review and history only. To take effect, a script must be pasted into
the Apps Script editor bound to its form's response Sheet:

1. Open the response Sheet for the form.
2. Extensions → Apps Script.
3. Paste the full contents of the matching `.gs` file, replacing whatever
   is there (or creating a new file if this is the first deploy).
4. Save.
5. Run `runSelfTest` from the editor's function picker and confirm the
   execution log shows `RESULT: all checks passed`.

Installable triggers (the `onFormSubmit` binding that fires on form submit)
bind to the *function name*, not to a specific saved revision, and always
run whatever code is currently saved for that function. So once a trigger
exists, pasting an updated script and saving is sufficient — the trigger
does not need to be re-created or re-authorized after a paste.

## Script Properties

Set these under Project Settings → Script Properties in each script's
bound Apps Script project.

- `endorse.gs` requires `GITHUB_TOKEN` and `KIT_API_KEY`.
- `meetup.gs` requires `GITHUB_TOKEN` only — it makes no Kit call.

## Placeholders

The `niagaraassembly` GitHub org and the `site` repo do not exist yet, so
`REPO = 'niagaraassembly/site'` in both scripts is a best-effort
placeholder — update it once the real repo exists. Likewise the Google
Forms themselves don't exist yet, so the form question names each script
maps from (`Name`, `Email`, `City / Town / Township`, `Trade / Expertise`,
`Comment` for Endorse; `What`, `When`, `Where`, `Contact`, `Calendar link`
for Meetup) are placeholders — when the forms are built, either match the
question wording to these names or update `mapResponse_` to match the
forms.

## Privacy and publication invariants

Both scripts hold two properties that `runSelfTest` checks directly:

- The endorsement form collects an email so Kit can reach the person, but
  the issue body is a public artefact and its data block is what
  eventually gets committed to a public repo. Email never enters the data
  block.
- Publication is decided by a GitHub label, never by a field in the data
  block. Adding `approved` puts a submission on the roster; adding
  `publish-comment` as well additionally publishes the endorsement's
  comment; `approved` alone keeps the submitter on the roster with the
  comment withheld. No `publish_comment` key ever appears in the JSON
  block — an editor never hand-edits the JSON to control this.
