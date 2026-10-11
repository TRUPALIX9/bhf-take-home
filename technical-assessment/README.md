# Technical assessment: original materials

What BHF sent for the Software Engineer, Full Stack & Automation role, kept unchanged, plus a map from every requirement to the code and test that meets it.

## Files

| File | What it is |
|---|---|
| [`nextjs-take-home-assessment.pdf`](nextjs-take-home-assessment.pdf) | Next.js brief (required) |
| [`python-take-home-assessment.pdf`](python-take-home-assessment.pdf) | Python brief (optional) |
| [`purchase_order_sample.txt`](purchase_order_sample.txt) | Sample vendor purchase order for the Python task |
| [`output_template_blank.xlsx`](output_template_blank.xlsx) | Column headers the Python output must match |

`python-po-parser/input/` holds byte-identical copies of the last two files, so that folder runs on its own. `scripts/check.sh` fails if the copies ever differ from the originals here.

## Submission instructions (from the recruiting email, 2026-10-09)

- Two parts: the Next.js assessment (required, about 2–3 focused hours) and the Python assessment (optional).
- Reply with public GitHub repo link(s): one repo per assessment, or one repo with two clearly separated folders. Each part has its own README.
- If an AI coding assistant was used, include its instruction or context file (CLAUDE.md or similar), or a note in the README.
- If anything is unclear, note the assumption in the README rather than guessing.
- The email gives 3 days; both PDFs say 2 days.

## Requirements → where they are met

### Next.js brief

| Requirement | Where | Proved by |
|---|---|---|
| Next.js 15, App Router, TypeScript, Tailwind; runs without errors | `nextjs-app/package.json`, `nextjs-app/app/` | `scripts/check.sh`: lint, typecheck, build |
| A page that lists items from a data set, rendered on the server | `nextjs-app/app/page.tsx` → `components/OrdersTable.tsx`, data in `data/orders.json` | e2e "list is rendered on the server" (data is in the raw HTML) |
| One server action that changes something meaningful | `nextjs-app/app/actions.ts` (`setReviewStatus`) | e2e "approve a PO, then move it back to review", "a click from an out-of-date tab can't undo an approval" |
| A dynamic route with a detail view for one item | `nextjs-app/app/orders/[poNumber]/page.tsx` → `components/OrderDetail.tsx` | e2e "open a PO from the list and see its line items", "unknown PO shows the not-found page" |
| README: how to run, what the action and route do, assumptions | [`nextjs-app/README.md`](../nextjs-app/README.md) | |
| Approximate time spent in the README | `nextjs-app/README.md` → Time spent | |
| AI instruction file committed as-is | [`CLAUDE.md`](../CLAUDE.md), [`nextjs-app/CLAUDE.md`](../nextjs-app/CLAUDE.md) | |
| Public GitHub repository | this repo | |

### Python brief

| Requirement | Where | Proved by (`python-po-parser/tests/test_po_extract.py`) |
|---|---|---|
| Extract header fields: buyer, ship terms, PO#, ref master PO#, ship date, vendor, ship to, bill to | `po_extract.py` → `parse_header`, `read_block`, `read_side_by_side_blocks` | `test_header_fields`, `test_address_blocks` |
| Extract every line item, including the UPC on the line under each row | `po_extract.py` → `parse_items`, `ITEM_RE`, `UPC_RE` | `test_twelve_items_each_with_its_upc`, `test_first_row_and_edge_cases`, `test_missing_upc_raises_naming_the_sku`, `test_unreadable_item_row_raises_instead_of_being_dropped` |
| One row per SKU, matching the template exactly, header fields on every row | `po_extract.py` → `write_xlsx`, `row_values` | `test_header_row_and_sheets_match_template`, `test_row_values`, `test_leading_zeros_preserved`, `test_unknown_template_column_raises` |
| Recompute EXT QTY and EXT COST and flag mismatches | `po_extract.py` → `check_item`, `check_totals`, `mark_flag` | `test_sample_has_no_flags`, `test_tampered_rows_are_flagged`, `test_tampered_text_is_flagged_in_rows_and_totals`, `test_flag_lands_on_the_failing_cell`, `test_main_exit_code_one_when_flagged` |
| Generated spreadsheet committed | `python-po-parser/output/purchase_order_sample.xlsx` | |
| README: approach, assumptions, what you'd change with more time | [`python-po-parser/README.md`](../python-po-parser/README.md) | |
| AI instruction file committed as-is | [`python-po-parser/CLAUDE.md`](../python-po-parser/CLAUDE.md) | |
