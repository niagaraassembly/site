#!/usr/bin/env bash
# Cursor cloud start step for site (environment E2). The static server runs in the "site" terminal
# declared in .cursor/environment.json (python3 -m http.server 8019), so nothing else starts here.
set -euo pipefail
echo "cloud-start: serve with the 'site' terminal on http://localhost:8019"
