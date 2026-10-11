#!/usr/bin/env bash
# Run the Python PO parser: purchase order text in, filled spreadsheet out.
# With no arguments it parses the sample PO into python-po-parser/output/.
# Any options are passed straight to po_extract.py.
#
# Usage: scripts/parse-po.sh [--input <file.txt>] [--output <file.xlsx>] [--json]
#
#   --input <file>     purchase order text file (default: the sample PO)
#   --output <file>    spreadsheet to write (default: output/purchase_order_sample.xlsx)
#   --template <file>  blank template to fill (default: input/output_template_blank.xlsx)
#   --json             also write <PO#>.json next to the spreadsheet (the app's seed format)
#   -h, --help         show this help
#
# Exit code 0 when every check passes, 1 when anything is flagged.
#
# Examples:
#   scripts/parse-po.sh
#   scripts/parse-po.sh --input ~/Downloads/po_1234.txt --output /tmp/po_1234.xlsx

source "$(dirname "$0")/_common.sh"

case "${1:-}" in
  -h | --help) usage && exit 0 ;;
esac

need_python
"$PYTHON" -c 'import openpyxl' 2>/dev/null || die "openpyxl is missing. Run scripts/setup.sh first."
exec "$PYTHON" "$PY_DIR/po_extract.py" "$@"
