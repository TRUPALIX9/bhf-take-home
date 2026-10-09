# python-po-parser

One script, `po_extract.py`, written for this one purchase order layout. The brief says not to build anything generic.

## Rules

- Keep it to one module with four sections, in order: model (dataclasses), parse, validate, write + `main`.
- Regexes are named constants at the top of the file.
- Parse money with `Decimal`. Write floats to Excel.
- SKU, UPC, Vendor Part #, Dept and PO# are strings written with the `@` format, so leading zeros survive (`0091120032129`, `04212`).
- Build the output from `input/output_template_blank.xlsx` with `load_workbook`. Map each header name to a value. An unknown header must raise, not be skipped.
- Validation flags go on the failing cell as a red fill plus a comment. Do not add columns or sheets; the schema must match the template exactly.
- If an item row has no UPC line under it, raise `ValueError` naming the SKU.

## Commands

- `python po_extract.py` writes `output/purchase_order_sample.xlsx` and prints a summary. Exit code 1 if anything is flagged.
- `python po_extract.py --json` also writes `output/TX9K2QP.json` in the shape of `nextjs-app/lib/types.ts` (`Order`). Copy it into the Next.js seed by hand; the parser never writes outside its own folder.
- `ruff check .` and `python -m pytest -q`

## Expected results on the sample

12 rows, 0 flags. Totals: EXT COST 447455.120, CTNS 3475, EXT QTY 6950, KG 119.18.
