#!/usr/bin/env bash
# Run every check for both parts. Stops at the first failure.
# CI (.github/workflows/check.yml) runs this same script with no options.
#
# Usage: scripts/check.sh [options]
#
#   --next         check only the Next.js app
#   --python       check only the Python parser
#   --no-e2e       skip the Playwright browser tests (faster)
#   -h, --help     show this help
#
# Environment:
#   PW_CHANNEL=chrome   run browser tests on the installed Google Chrome
#                       instead of Playwright's downloaded Chromium
#
# What runs:
#   originals  parser input files match technical-assessment/
#   next       lint, typecheck, unit tests (Vitest), build, e2e (Playwright)
#   python     lint (ruff), tests (pytest), a run on the sample PO
#
# Examples:
#   scripts/check.sh
#   scripts/check.sh --next --no-e2e
#   PW_CHANNEL=chrome scripts/check.sh

source "$(dirname "$0")/_common.sh"

do_next=1 do_python=1 do_e2e=1
while [ $# -gt 0 ]; do
  case "$1" in
    --next) do_python=0 ;;
    --python) do_next=0 ;;
    --no-e2e) do_e2e=0 ;;
    -h | --help) usage && exit 0 ;;
    *) die "unknown option '$1' (see --help)" ;;
  esac
  shift
done

start=$SECONDS

# --- Original materials ---
# python-po-parser/input/ keeps copies so that folder runs on its own; they must match the originals.
if [ "$do_python" = 1 ] && [ -d "$ROOT/technical-assessment" ]; then
  step "originals: parser inputs match technical-assessment/"
  for f in purchase_order_sample.txt output_template_blank.xlsx; do
    cmp "$ROOT/technical-assessment/$f" "$PY_DIR/input/$f" || die "$f differs from the original"
  done
  ok "inputs identical"
fi

# --- Next.js app ---
if [ "$do_next" = 1 ]; then
  need_node
  cd "$NEXT_DIR"
  step "next: lint";      npm run --silent lint
  step "next: typecheck"; npx tsc --noEmit
  step "next: test";      npm test --silent
  step "next: build";     NEXT_DIST_DIR=.next-test npm run --silent build  # own folder, so a running dev server is untouched
  if [ "$do_e2e" = 1 ]; then
    step "next: e2e"
    npm run --silent test:e2e
  else
    note "skipped e2e (--no-e2e)"
  fi
fi

# --- Python PO parser ---
# The run step exits 1 if the sample PO has any flag, which fails the check.
if [ "$do_python" = 1 ]; then
  need_python
  cd "$PY_DIR"
  step "python: lint"; "$PYTHON" -m ruff check .
  step "python: test"; "$PYTHON" -m pytest -q
  step "python: run";  "$PYTHON" po_extract.py --output "$(mktemp -d)/check.xlsx" # keep the committed output untouched
fi

ok "All checks passed in $((SECONDS - start))s."
