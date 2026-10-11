#!/usr/bin/env bash
# Install everything both parts need. Safe to run again.
#
# Usage: scripts/setup.sh [options]
#
#   --browser      also download Playwright's Chromium (needed once for e2e tests;
#                  skip it and use PW_CHANNEL=chrome if Google Chrome is installed)
#   --next-only    set up only the Next.js app
#   --python-only  set up only the Python parser
#   -h, --help     show this help
#
# Examples:
#   scripts/setup.sh
#   scripts/setup.sh --browser

source "$(dirname "$0")/_common.sh"

do_next=1 do_python=1 do_browser=0
while [ $# -gt 0 ]; do
  case "$1" in
    --browser) do_browser=1 ;;
    --next-only) do_python=0 ;;
    --python-only) do_next=0 ;;
    -h | --help) usage && exit 0 ;;
    *) die "unknown option '$1' (see --help)" ;;
  esac
  shift
done

# --- Next.js app ---
if [ "$do_next" = 1 ]; then
  need_node
  step "next: install packages (npm ci, exact versions from package-lock.json)"
  (cd "$NEXT_DIR" && npm ci --no-audit --no-fund)
  if [ "$do_browser" = 1 ]; then
    step "next: download Playwright Chromium"
    (cd "$NEXT_DIR" && npx playwright install chromium)
  fi
  ok "Next.js app ready"
fi

# --- Python parser ---
if [ "$do_python" = 1 ]; then
  need_python
  step "python: install packages (openpyxl, pytest, ruff)"
  "$PYTHON" -m pip install --quiet -r "$PY_DIR/requirements-dev.txt"
  ok "Python parser ready"
fi

note "Next: scripts/dev.sh to open the app, scripts/check.sh to run every check."
