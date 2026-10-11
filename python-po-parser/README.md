# python-po-parser

`po_extract.py` reads the vendor purchase order in `input/purchase_order_sample.txt`, checks its math, and writes one row per SKU into a copy of `input/output_template_blank.xlsx`. The result is committed at `output/purchase_order_sample.xlsx`.

It is written for this one PO layout, as the brief asks. It is not a generic parser.

## How to run

Python 3.11+.

```bash
cd python-po-parser
python3 -m pip install -r requirements-dev.txt

python3 po_extract.py            # writes output/purchase_order_sample.xlsx
python3 po_extract.py --json     # also writes output/TX9K2QP.json
ruff check .
python3 -m pytest -q
```

Options: `--input`, `--template` and `--output` (defaults are the files above, relative to this folder). The script prints a short summary and exits with code 1 if anything is flagged.

## Approach

One module, five sections, in order:

1. **Model.** Frozen dataclasses: `Header`, `LineItem`, `Totals`, `PurchaseOrder`, and `Flag`. Money and measurements are `Decimal`, so the checks compare exact values with no float noise.
2. **Parse.** All regexes are named constants at the top of the file.
   - Header fields (`BUYER:`, `SHIP TERMS:`, `PO#:` ...) are read with one small regex each. A value ends at a run of two or more spaces, which is where the next column starts.
   - `VENDOR` is the block under its dashes, up to the first blank line.
   - `SHIP TO` and `BILL TO` sit side by side, so each line is split at the column where the `BILL TO` heading starts.
   - Item rows are matched by one anchored regex with named groups. The description is lazy, so it stops before the first number. This is safer than slicing by column, because the descriptions contain spaces and the numbers are right-aligned.
   - The UPC must be on the very next line (`^ {4}\d{12,14}$`). If it is missing, parsing raises `ValueError` naming the SKU.
   - Any other non-blank line between the column headings and `TOTALS:` raises `ValueError` with its line number, so a row the regex cannot read is never dropped silently.
   - The `TOTALS:` numbers are not aligned under their columns, so they are read in order.
3. **Validate.** Recompute and compare (see below).
4. **Write.** Load the template with `openpyxl.load_workbook`, read its header row, and for each item build a dict of *template column name -> value*. Each cell is written in the template's column order. A template column with no mapping raises instead of being skipped. Decimals are written as floats; ID columns are written as text with the `@` format.
5. **Main.** `argparse` options, then parse → write → print the summary and flags → exit code 0 or 1.

## Column mapping

| Template column | Source in the PO text | Written as |
|---|---|---|
| FILENAME | Name of the input file | text |
| BUYER | `BUYER:` (line 1) | text |
| SHIP TERMS | `SHIP TERMS:` (line 2) | text |
| PO# | `PO#:` (line 2) | text |
| REF MASTER PO# | `REF MASTER PO#:` | text |
| SHIP DATE | `SHIP DATE: 5/02/26` | date, `m/d/yyyy` |
| VENDOR | `VENDOR` block, all lines | text, one line per address line, wrapped |
| SHIP TO | Left half of the `SHIP TO` / `BILL TO` block | text, wrapped |
| BILL TO | Right half of that block | text, wrapped |
| Dept | Item row, `DPT` | text |
| SKU | Item row, `SKU` | text |
| UPC | The line under the item row | text (keeps leading zeros) |
| Vendor Part # | Item row, `VENDOR PART#` | text (keeps leading zeros) |
| Description | Item row, `DESCRIPTION` | text |
| Retail | Item row, `RETAIL` | number, `0.00` |
| Cost | Item row, `COST` | number, `0.000` |
| EXT Cost | Item row, `EXT COST` | number, `#,##0.000` |
| CTNS | Item row, `CTNS` | integer |
| CSPK | Item row, `CSPK` | integer |
| EXT QTY | Item row, `EXT QTY` | integer |
| Cube | Item row, `CUBE` | number, `0.0000` |
| Kilograms | Item row, `KILOGRAMS` | number, `0.00` |
| Total Cost | `TOTALS:` EXT COST (the PO grand total) | number, `#,##0.00` |

## Validation

Per row, from the parsed numbers:

- **EXT QTY** must equal `CTNS x CSPK`.
- **EXT Cost** must equal `COST x EXT QTY` (exact, in `Decimal`).

Across the order, the printed `TOTALS:` line must equal the sum of the rows for EXT COST, CTNS, EXT QTY and KILOGRAMS.

How flags show up:

- In the spreadsheet, a failing EXT QTY or EXT Cost cell gets a red fill (`FFC7CE`) and a cell comment with the printed and recomputed values. No columns or sheets are added, so the output still matches the template exactly.
- On stdout, every flag is printed as a `FLAG` line, including TOTALS mismatches (they have no single cell to mark).
- The exit code is 1 if there is any flag, 0 otherwise.

## Results on the sample

```
PO TX9K2QP: 12 rows -> .../output/purchase_order_sample.xlsx
Totals: EXT COST 447455.120, CTNS 3475, EXT QTY 6950, KG 119.18
Flags: 0
```

12 rows, 0 flags. Every row's EXT QTY and EXT Cost match, and the TOTALS line matches the sum of the rows. The tests tamper with the text to prove the flags do fire.

## Assumptions

- **Total Cost** is the PO grand total (447,455.12), repeated on every row like the other header fields. The per-row cost is already in EXT Cost.
- **SHIP DATE** `5/02/26` is read as M/D/YY and written as a real Excel date (May 2, 2026).
- **Addresses** (VENDOR, SHIP TO, BILL TO) are kept as multi-line text in one cell, with wrap on. The PHONE and FAX lines are kept, because they are part of the printed block.
- **Buyer, vendor and location numbers** (`610`, `50201`, `331`) are kept as printed, as part of the text.
- **FILENAME** is the input file's name, `purchase_order_sample.txt`.
- The **`--json` export** exists to seed the Next.js app in this repo (`nextjs-app/data/orders.json`). It writes `<PO#>.json` next to the output spreadsheet, in the shape of the app's `Order` type, with `status: "pending"` and `poDate` taken from the date on line 1 (3/14/2026). It is copied into the app by hand; the parser never writes outside this folder.

## With more time

- Run it over more real POs to see which parts of the layout actually vary (multi-page orders, wrapped descriptions, missing fields), and only then make the parser looser where needed.
- Check `Total Invoice Value: 447,455.12` against the TOTALS line as well.
- Put a short "Flags" note somewhere visible in the workbook if the downstream system allows it (the template forbids extra columns or sheets today).
- Batch mode: a folder of POs in, one workbook per PO out.

## Time spent

About 1.5 hours in total for both parts, working with Claude Code. See the [root README](../README.md).

## AI use

Built with Claude Code. Its instructions are committed as-is: the repo root `CLAUDE.md` and this folder's `CLAUDE.md`.
