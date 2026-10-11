#!/usr/bin/env bash
# Runs every check for both parts. Stops on the first failure.
# Run from anywhere: scripts/check.sh. CI (.github/workflows/check.yml) runs this same script.
# Each part is skipped if its folder is missing.
set -euo pipefail
# The repo root, found from this script's own path.
root="$(cd "$(dirname "$0")/.." && pwd)"

# Prints a heading before each check.
step() { printf '\n== %s\n' "$1"; }

# --- Original materials ---
# python-po-parser/input/ keeps copies so that folder runs on its own; they must match the originals.
if [ -d "$root/technical-assessment" ]; then
  step "inputs match technical-assessment/"
  for f in purchase_order_sample.txt output_template_blank.xlsx; do
    cmp "$root/technical-assessment/$f" "$root/python-po-parser/input/$f"
  done
fi

# --- Next.js app ---
if [ -f "$root/nextjs-app/package.json" ]; then
  cd "$root/nextjs-app"
  step "next: lint";      npm run --silent lint
  step "next: typecheck"; npx tsc --noEmit
  step "next: test";      npm test --silent
  step "next: build";     npm run --silent build
  step "next: e2e";       npm run --silent test:e2e  # set PW_CHANNEL=chrome to use installed Chrome
fi

# --- Python PO parser ---
# The run step exits 1 if the sample PO has any flag, which fails the check.
if [ -f "$root/python-po-parser/po_extract.py" ]; then
  cd "$root/python-po-parser"
  step "python: lint";    ruff check .
  step "python: test";    python3 -m pytest -q
  step "python: run";     python3 po_extract.py --output "$(mktemp -d)/check.xlsx"  # keep the committed output untouched
fi

printf '\nAll checks passed.\n'
