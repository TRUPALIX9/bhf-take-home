# Shared helpers for the scripts in this folder. Sourced by them, never run directly.
# Gives every script the same paths, the same output style and the same error handling.

set -euo pipefail

# --- Paths (work no matter which folder the script is run from) ---
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NEXT_DIR="$ROOT/nextjs-app"
PY_DIR="$ROOT/python-po-parser"
PYTHON="${PYTHON:-python3}" # override with PYTHON=/path/to/python if needed

# --- Output (colors only when writing to a terminal, so logs and CI stay clean) ---
if [ -t 1 ]; then
  BOLD=$'\033[1m' DIM=$'\033[2m' GREEN=$'\033[32m' RED=$'\033[31m' RESET=$'\033[0m'
else
  BOLD="" DIM="" GREEN="" RED="" RESET=""
fi

step() { printf '\n%s== %s%s\n' "$BOLD" "$1" "$RESET"; }
ok() { printf '%s✓ %s%s\n' "$GREEN" "$1" "$RESET"; }
note() { printf '%s%s%s\n' "$DIM" "$1" "$RESET"; }
die() {
  printf '%serror:%s %s\n' "$RED" "$RESET" "$1" >&2
  exit 1
}

# --- Requirements ---
# need <command> <hint>: stop with a helpful message if a tool is missing.
need() { command -v "$1" >/dev/null 2>&1 || die "$1 is not installed. $2"; }

need_node() {
  need node "Install Node.js 20 or newer: https://nodejs.org"
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 20 ] || die "Node.js 20 or newer is required (found $(node -v))."
}

need_python() {
  need "$PYTHON" "Install Python 3.11 or newer."
  "$PYTHON" -c 'import sys; sys.exit(sys.version_info < (3, 11))' ||
    die "Python 3.11 or newer is required (found $("$PYTHON" --version))."
}

# Show a script's usage: the comment block at the top of the file, without the '#'.
usage() {
  sed -n '2,/^$/p' "$0" | sed -E 's/^# ?//'
}
