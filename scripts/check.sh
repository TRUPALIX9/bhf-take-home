#!/usr/bin/env bash
# Runs every check for both parts. Stops on the first failure.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

step() { printf '\n== %s\n' "$1"; }

if [ -f "$root/nextjs-app/package.json" ]; then
  cd "$root/nextjs-app"
  step "next: lint";      npm run --silent lint
  step "next: typecheck"; npx tsc --noEmit
  step "next: test";      npm test --silent
  step "next: build";     npm run --silent build
  step "next: e2e";       npm run --silent test:e2e  # set PW_CHANNEL=chrome to use installed Chrome
fi

if [ -f "$root/python-po-parser/po_extract.py" ]; then
  cd "$root/python-po-parser"
  step "python: lint";    ruff check .
  step "python: test";    python3 -m pytest -q
  step "python: run";     python3 po_extract.py --output "$(mktemp -d)/check.xlsx"  # keep the committed output untouched
fi

printf '\nAll checks passed.\n'
