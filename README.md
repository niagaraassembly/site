# Niagara Assembly

Buildless static manifesto site for `niagaraassembly.com`.

Run locally:

```bash
python3 -m http.server 8019
```

Then open `http://localhost:8019`.

Test:

```bash
node --test tests/*.test.mjs
python3 -m unittest tests/test_approve_request.py
```

**Nothing is connected yet.** No Google Forms, GitHub repo, or Kit
credentials exist — see [docs/SETUP.md](docs/SETUP.md) for the ordered
runbook that wires it up.

Data flow:

```text
browser form -> Google Form -> response Sheet -> Apps Script -> GitHub Issue + Kit
approved label -> GitHub Action -> scripts/approve_request.py -> data/*.json
```

`data/*.json` is public and is written only by the approval workflow. Endorsement email and meetup submitter name/email are collected for follow-up and Kit but never written to public JSON. Meetup contact is public once approved, and the form says so.

`google-apps-script/*.gs` is deployed by pasting each file into its bound response Sheet's Apps Script editor, saving, and running `runSelfTest`. Each script needs `GITHUB_TOKEN`, `KIT_API_KEY`, and `KIT_FORM_ID` Script Properties.
