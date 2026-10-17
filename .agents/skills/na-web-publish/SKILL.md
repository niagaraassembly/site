---
name: na-web-publish
description: Use when building, checking or previewing the site and its regional subsites, or adding a piece, page or magazine output to it.
---

# Site build and publish

1. How the parts fit and what to rebuild: `docs/MECHANICS.md`; subsites: `docs/architecture/subsites.md`; templates: `content/templates/README.md`.
2. Rebuild subsites after editing a piece or subsite definition: `node scripts/subsite/build.mjs`.
3. Preview: `python3 -m http.server 8019` (the `site` terminal in cloud agents), open `/site/greater-niagara/`.
4. Test: `node --test tests/*.test.mjs` and `python3 -m unittest discover -s tests -p 'test_*.py'`. Some tests fail on master already; compare with master before blaming your change.
5. Magazine pages arrive from the `magazines` repo by PR; research data only from approved na-research exports.
6. Forms and Apps Script (`google-apps-script/`) post issues to the private crm repo; never put form data in this public repo. Open a PR citing the Linear issue; never merge.
