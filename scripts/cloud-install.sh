#!/usr/bin/env bash
# Cursor cloud Build step for site (environment E2). Idempotent: safe to rerun on a prepared disk.
# Buildless static site: no npm dependencies. Checks runtimes and rebuilds the subsites
# (node scripts/subsite/build.mjs regenerates the same files, so a rerun leaves the tree clean).
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo "node is required (tests and subsite build)"; exit 1; }
echo "node $(node --version)"
python3 --version
if [ -f package-lock.json ]; then npm ci --no-audit --no-fund
elif [ -f package.json ]; then npm install --no-audit --no-fund; fi
node scripts/subsite/build.mjs
echo "cloud-install: ok"
