#!/usr/bin/env bash
# Start the Next.js app.
#
# Usage: scripts/dev.sh [options]
#
#   --slow         add 1.2 s of simulated latency so loading skeletons are visible
#   --prod         build and run the production server instead of the dev server
#   --port <n>     port to listen on (default 3000)
#   -h, --help     show this help
#
# Examples:
#   scripts/dev.sh                 http://localhost:3000
#   scripts/dev.sh --slow
#   scripts/dev.sh --prod --port 4000

source "$(dirname "$0")/_common.sh"

mode=dev port=3000
while [ $# -gt 0 ]; do
  case "$1" in
    --slow) export SIMULATED_LATENCY_MS=1200 ;;
    --prod) mode=prod ;;
    --port)
      [ $# -ge 2 ] || die "--port needs a number"
      port="$2"
      shift
      ;;
    -h | --help) usage && exit 0 ;;
    *) die "unknown option '$1' (see --help)" ;;
  esac
  shift
done

need_node
[ -d "$NEXT_DIR/node_modules" ] || die "packages are not installed. Run scripts/setup.sh first."
cd "$NEXT_DIR"

if [ "$mode" = prod ]; then
  step "build"
  npm run --silent build
  step "start production server on http://localhost:$port"
  exec npx next start --port "$port"
else
  step "start dev server on http://localhost:$port${SIMULATED_LATENCY_MS:+ (slow mode)}"
  exec npx next dev --turbopack --port "$port"
fi
