# UK Atlas — Committed Secret Locations

**Repo:** https://github.com/babbworks/atlas (`master`)  
**Assessment date:** 2026-09-14  
**Rule:** Paths and types only. Values never recorded.

---

## Confirmed committed secrets

| Path | Line | Secret type | Notes |
|------|------|-------------|-------|
| `server.py` | 24 | Companies House REST API key (UUID) | Hardcoded as `CH_KEY`; used to build HTTP Basic auth for `api.company-information.service.gov.uk` |
| `server.py` | 26 | Derived Basic auth header material | Base64 of `{CH_KEY}:` — same credential, derived form |

No other live API keys, tokens, passwords, or private keys found in scanned source (JS/HTML/CSS/Python/docs/config). Dataset UUID query params in `scripts/process_epr.py` and public data.gov.uk dataset IDs in `system/datasets.md` are public resource identifiers, not credentials.

---

## Revoke / remediate guidance

1. **Revoke immediately** the Companies House API key at https://developer.company-information.service.gov.uk/ (or the CH developer account that issued it). Treat the key as publicly compromised (present in a public GitHub repo; also recoverable from git history even after a force-push unless history is purged).
2. **Issue a replacement key**; never commit it. Prefer environment variable (e.g. `CH_API_KEY`) or a local untracked `.env` / secrets file listed in `.gitignore`.
3. **Update `server.py`** to read the key from the environment; fail closed if unset.
4. **Purge from git history** if the key was ever pushed (e.g. `git filter-repo` / BFG) and rotate again after purge — rotation alone is insufficient while the old blob remains reachable.
5. **Monitor** Companies House API usage for unexpected traffic until rotation is confirmed.
6. **Do not** rely on GitHub Pages / static hosting for CH: the intentional design keeps the key on the Python proxy (`server.py`); static deploys cannot safely hold this secret.

---

## Related non-secret auth surfaces

| Path | Type | Action |
|------|------|--------|
| `companies.js` | Client calls `/api/ch/*` (no key in browser) | Keep; depends on local `server.py` proxy |
| `inspire-proxy/worker.js` | Cloudflare Worker CORS proxy; no upstream auth | No revoke needed |
| `inspire.js` | Placeholder Workers URL `inspire-proxy.REPLACE_WITH_YOUR_SUBDOMAIN.workers.dev` | Not a secret |
