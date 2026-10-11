"""Turn the sample purchase order text file into the output template spreadsheet.

Run: python3 po_extract.py [--input ...] [--output ...] [--json]
Flow: text -> parse -> validate -> filled template (.xlsx), plus optional JSON
that seeds the Next.js app. Written for this one PO layout, on purpose.
"""

import argparse
import json
import re
import sys
import zipfile
from dataclasses import asdict, dataclass, fields
from datetime import date, datetime
from decimal import Decimal
from itertools import takewhile
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, PatternFill

HERE = Path(__file__).resolve().parent
DEFAULT_INPUT = HERE / "input" / "purchase_order_sample.txt"
DEFAULT_TEMPLATE = HERE / "input" / "output_template_blank.xlsx"
DEFAULT_OUTPUT = HERE / "output" / "purchase_order_sample.xlsx"

# Header fields. A value ends at a run of 2+ spaces, where the next column starts,
# so "BUYER: 610 JORDAN MILLER   ..." reads "610 JORDAN MILLER" whole.
BUYER_RE = re.compile(r"BUYER: (?P<value>.+?)(?: {2,}|$)")
SHIP_TERMS_RE = re.compile(r"SHIP TERMS: (?P<value>.+?)(?: {2,}|$)")
# The lookbehind skips "REF MASTER PO#:", which also ends in "PO#: ".
PO_NUMBER_RE = re.compile(r"(?<!MASTER )PO#: (?P<value>\S+)")
REF_MASTER_PO_RE = re.compile(r"REF MASTER PO#: (?P<value>\S+)")
SHIP_DATE_RE = re.compile(r"SHIP DATE: (?P<value>\d{1,2}/\d{1,2}/\d{2})$")  # 5/02/26
# The PO date has no label: it is the 4-digit-year date ending the BUYER line (3/14/2026).
PO_DATE_RE = re.compile(r" (?P<value>\d{1,2}/\d{1,2}/\d{4})$")

# One item row: three text columns, a description with spaces, then nine numbers.
# "210 71097188  04212  NORDPEAK ASHER T CMFST GRY  149.99  49.400 ... 7.72".
# Anchored at both ends, so a row with a missing or extra number does not match.
ITEM_RE = re.compile(
    r"^(?P<dept>\d{3}) +(?P<sku>\d+) +(?P<vendor_part>\S+) +"
    r"(?P<description>.+?) +"  # lazy, so it stops before the first number
    r"(?P<retail>\d+\.\d+) +(?P<cost>\d+\.\d+) +(?P<ext_cost>\d+\.\d+) +"
    r"(?P<cartons>\d+) +(?P<case_pack>\d+) +(?P<ext_qty>\d+) +"
    r"(?P<cube>\d+\.\d+) +(?P<kilograms>\d+\.\d+)$"
)
# The UPC sits alone on the line under its item row: "    0091120032129".
UPC_RE = re.compile(r"^ {4}(?P<upc>\d{12,14})$")
# TOTALS numbers are not aligned under their columns, so read them in order:
# "TOTALS:  447455.120  3475  6950  119.18" = EXT COST, CTNS, EXT QTY, KILOGRAMS.
TOTALS_RE = re.compile(
    r"^TOTALS: +(?P<ext_cost>\d+\.\d+) +(?P<cartons>\d+) +"
    r"(?P<ext_qty>\d+) +(?P<kilograms>\d+\.\d+)$"
)


# ---------------------------------------------------------------- model

# Frozen, so parsed data is read-only. Money and weights are Decimal, not float,
# so 49.400 x 136 equals 6718.400 exactly and the checks can use plain ==.


@dataclass(frozen=True)
class Header:
    po_number: str
    ref_master_po: str
    po_date: date
    ship_date: date
    buyer: str
    ship_terms: str
    vendor: tuple[str, ...]  # one entry per printed address line
    ship_to: tuple[str, ...]
    bill_to: tuple[str, ...]


@dataclass(frozen=True)
class LineItem:
    """One item row plus the UPC line under it."""

    dept: str
    sku: str
    upc: str
    vendor_part: str
    description: str
    retail: Decimal
    cost: Decimal
    ext_cost: Decimal
    cartons: int
    case_pack: int
    ext_qty: int
    cube: Decimal
    kilograms: Decimal


@dataclass(frozen=True)
class Totals:
    ext_cost: Decimal
    cartons: int
    ext_qty: int
    kilograms: Decimal


@dataclass(frozen=True)
class PurchaseOrder:
    header: Header
    items: tuple[LineItem, ...]
    totals: Totals


@dataclass(frozen=True)
class Flag:
    column: str  # the template column the problem belongs on
    message: str


# ---------------------------------------------------------------- parse


def parse(text: str) -> PurchaseOrder:
    lines = text.splitlines()
    if not any(line.strip() for line in lines):
        raise ValueError("the file is empty")
    # TOTALS first: it ends the item table, so a missing one gives a clear error.
    totals = parse_totals(lines)
    return PurchaseOrder(header=parse_header(lines), items=parse_items(lines), totals=totals)


def parse_header(lines: list[str]) -> Header:
    ship_to, bill_to = read_side_by_side_blocks(lines, "SHIP TO", "BILL TO")
    return Header(
        po_number=find_value(lines, PO_NUMBER_RE, "PO#"),
        ref_master_po=find_value(lines, REF_MASTER_PO_RE, "REF MASTER PO#"),
        po_date=to_date(find_value(lines, PO_DATE_RE, "PO date"), "%m/%d/%Y"),
        ship_date=to_date(find_value(lines, SHIP_DATE_RE, "SHIP DATE"), "%m/%d/%y"),
        buyer=find_value(lines, BUYER_RE, "BUYER"),
        ship_terms=find_value(lines, SHIP_TERMS_RE, "SHIP TERMS"),
        vendor=tuple(line.strip() for line in block_lines(lines, "VENDOR")),
        ship_to=ship_to,
        bill_to=bill_to,
    )


def find_value(lines: list[str], pattern: re.Pattern, name: str) -> str:
    """The 'value' group of the first line that matches."""
    for line in lines:
        if match := pattern.search(line):
            return match["value"].strip()
    raise ValueError(f"header field {name} not found")


def to_date(text: str, date_format: str) -> date:
    try:
        return datetime.strptime(text, date_format).date()
    except ValueError:
        raise ValueError(f"{text!r} is not a valid date") from None


def from_match(cls, match: re.Match, **extra):
    """Build a dataclass from regex groups, each converted to its field type (int, Decimal)."""
    values = {**match.groupdict(), **extra}
    return cls(**{field.name: field.type(values[field.name]) for field in fields(cls)})


def find_block_start(lines: list[str], title: str) -> int:
    """Index of the title line of a block that is underlined with dashes."""
    for index, line in enumerate(lines[:-1]):
        if line.startswith(title) and lines[index + 1].startswith("-"):
            return index
    raise ValueError(f"block {title} not found")


def block_lines(lines: list[str], title: str) -> list[str]:
    """The lines under a block's dashes, up to the first blank line."""
    return list(takewhile(str.strip, lines[find_block_start(lines, title) + 2 :]))


def read_side_by_side_blocks(
    lines: list[str], left_title: str, right_title: str
) -> tuple[tuple[str, ...], tuple[str, ...]]:
    """Split each line where the right title starts; SHIP TO has one more line than BILL TO."""
    split_at = lines[find_block_start(lines, left_title)].index(right_title)
    rows = block_lines(lines, left_title)
    left = tuple(row[:split_at].strip() for row in rows if row[:split_at].strip())
    right = tuple(row[split_at:].strip() for row in rows if row[split_at:].strip())
    return left, right


def parse_items(lines: list[str]) -> tuple[LineItem, ...]:
    """Each item row with the UPC under it. Any other non-blank line before TOTALS raises."""
    index = find_block_start(lines, "DPT") + 2  # skip the headings and dashes
    items = []
    while index < len(lines) and not lines[index].startswith("TOTALS:"):
        line = lines[index]
        if not line.strip():
            index += 1
            continue
        match = ITEM_RE.match(line)
        if not match:
            raise ValueError(f"line {index + 1} is not an item row: {line.strip()!r}")
        upc_match = UPC_RE.match(lines[index + 1] if index + 1 < len(lines) else "")
        if not upc_match:
            raise ValueError(f"item SKU {match['sku']} has no UPC line under it")
        items.append(from_match(LineItem, match, upc=upc_match["upc"]))
        index += 2  # the item row and its UPC line
    return tuple(items)


def parse_totals(lines: list[str]) -> Totals:
    for line in lines:
        if match := TOTALS_RE.match(line):
            return from_match(Totals, match)
    raise ValueError("TOTALS line not found")


# ---------------------------------------------------------------- validate


def check_item(item: LineItem) -> list[Flag]:
    """Recompute EXT QTY and EXT Cost. Only flags; the printed values are written as-is."""
    flags = []
    expected_qty = item.cartons * item.case_pack
    if expected_qty != item.ext_qty:
        flags.append(Flag("EXT QTY", f"printed {item.ext_qty}, CTNS x CSPK = {expected_qty}"))
    expected_cost = item.cost * item.ext_qty
    if expected_cost != item.ext_cost:
        flags.append(
            Flag("EXT Cost", f"printed {item.ext_cost}, COST x EXT QTY = {expected_cost}")
        )
    return flags


def check_totals(po: PurchaseOrder) -> list[str]:
    """Compare the printed TOTALS line with the sum of the item rows."""
    checks = [
        ("EXT COST", po.totals.ext_cost, sum(item.ext_cost for item in po.items)),
        ("CTNS", po.totals.cartons, sum(item.cartons for item in po.items)),
        ("EXT QTY", po.totals.ext_qty, sum(item.ext_qty for item in po.items)),
        ("KILOGRAMS", po.totals.kilograms, sum(item.kilograms for item in po.items)),
    ]
    return [
        f"TOTALS {name}: printed {printed}, sum of rows = {summed}"
        for name, printed, summed in checks
        if printed != summed
    ]


def all_flags(po: PurchaseOrder) -> list[str]:
    """Every problem in the order, one printable line each."""
    messages = [
        f"SKU {item.sku} {flag.column}: {flag.message}"
        for item in po.items
        for flag in check_item(item)
    ]
    return messages + check_totals(po)


# ---------------------------------------------------------------- write

FLAG_FILL = PatternFill(fill_type="solid", fgColor="FFC7CE")  # Excel's "bad" cell red
# "@" is Excel's Text format: codes like UPC 0091120032129 keep their leading zeros.
TEXT_FORMAT = "@"
# Columns not listed here are text. Cost has 3 decimals because the PO prints 49.400.
NUMBER_FORMATS = {
    "SHIP DATE": "m/d/yyyy", "Retail": "0.00", "Cost": "0.000", "EXT Cost": "#,##0.000",
    "CTNS": "0", "CSPK": "0", "EXT QTY": "0",
    "Cube": "0.0000", "Kilograms": "0.00", "Total Cost": "#,##0.00",
}


def row_values(po: PurchaseOrder, item: LineItem, filename: str) -> dict:
    """Template column name -> value for one spreadsheet row."""
    header = po.header
    return {
        "FILENAME": filename,
        "BUYER": header.buyer,
        "SHIP TERMS": header.ship_terms,
        "PO#": header.po_number,
        "REF MASTER PO#": header.ref_master_po,
        "SHIP DATE": header.ship_date,
        "VENDOR": "\n".join(header.vendor),
        "SHIP TO": "\n".join(header.ship_to),
        "BILL TO": "\n".join(header.bill_to),
        "Dept": item.dept,
        "SKU": item.sku,
        "UPC": item.upc,
        "Vendor Part #": item.vendor_part,
        "Description": item.description,
        "Retail": item.retail,
        "Cost": item.cost,
        "EXT Cost": item.ext_cost,
        "CTNS": item.cartons,
        "CSPK": item.case_pack,
        "EXT QTY": item.ext_qty,
        "Cube": item.cube,
        "Kilograms": item.kilograms,
        "Total Cost": po.totals.ext_cost,
    }


def write_cell(cell, column: str, value) -> None:
    """Write one value with its number format. Decimals go to Excel as floats."""
    cell.value = float(value) if isinstance(value, Decimal) else value
    cell.number_format = NUMBER_FORMATS.get(column, TEXT_FORMAT)
    if isinstance(value, str) and "\n" in value:
        cell.alignment = Alignment(wrap_text=True, vertical="top")


def write_xlsx(po: PurchaseOrder, filename: str, template: Path, output: Path) -> None:
    """Fill a copy of the template (keeps its header, sheet name, widths), one row per item.

    Columns are looked up by header name; a flag becomes a red fill plus a comment.
    """
    workbook = load_workbook(template)
    sheet = workbook["Sheet1"]
    columns = [cell.value for cell in sheet[1]]
    for row, item in enumerate(po.items, start=2):
        values = row_values(po, item, filename)
        for col, column in enumerate(columns, start=1):
            if column not in values:
                raise ValueError(f"template column {column!r} has no mapping")
            write_cell(sheet.cell(row, col), column, values[column])
        for flag in check_item(item):
            cell = sheet.cell(row, columns.index(flag.column) + 1)
            cell.fill = FLAG_FILL
            cell.comment = Comment(flag.message, "po_extract")
    output.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output)


def camel_case(record) -> dict:
    """A dataclass as a dict keyed like the app's types: ship_to -> shipTo."""
    result = {}
    for name, value in asdict(record).items():
        first, *rest = name.split("_")
        result[first + "".join(word.title() for word in rest)] = value
    return result


def to_json_value(value):
    """json.dumps fallback for the two types it can't write: Decimal and date."""
    return float(value) if isinstance(value, Decimal) else value.isoformat()


def write_json(po: PurchaseOrder, output: Path) -> None:
    """Save the order in the shape of the Next.js app's Order type."""
    order = {
        **camel_case(po.header),
        "totalCost": po.totals.ext_cost,
        "status": "pending",
        "lines": [camel_case(item) for item in po.items],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(order, indent=2, default=to_json_value) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- main

# 0 = written, all checks pass; 1 = written, but rows are flagged (so a script or
# CI notices); 2 = the input could not be processed, with a one-line error.
EXIT_OK, EXIT_FLAGGED, EXIT_ERROR = 0, 1, 2


def parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--json", action="store_true", help="also write <PO#>.json next to the output spreadsheet"
    )
    return parser.parse_args(argv)


def fail(message: str) -> int:
    print(f"error: {message}", file=sys.stderr)
    return EXIT_ERROR


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    name = args.input.name
    try:
        po = parse(args.input.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return fail(f"input file not found: {args.input}")
    except IsADirectoryError:
        return fail(f"input is a folder, not a file: {args.input}")
    except UnicodeDecodeError:  # a ValueError subclass, so it must come first
        return fail(f"{name} is not a text file (it could not be read as UTF-8)")
    except ValueError as err:
        return fail(f"{name} doesn't match the expected purchase order layout: {err}")

    try:
        write_xlsx(po, name, args.template, args.output)
        if args.json:
            json_path = args.output.parent / f"{po.header.po_number}.json"
            write_json(po, json_path)
    except FileNotFoundError:
        return fail(f"template not found: {args.template}")
    except (zipfile.BadZipFile, KeyError):  # not an xlsx / no Sheet1
        return fail(f"template is not a valid .xlsx with a Sheet1: {args.template}")
    except ValueError as err:
        return fail(f"template doesn't match: {err}")
    except OSError as err:  # read-only folder, full disk, file open in Excel
        return fail(f"could not write {err.filename or args.output}: {err.strerror}")

    print(f"PO {po.header.po_number}: {len(po.items)} rows -> {args.output}")
    if args.json:
        print(f"JSON -> {json_path}")
    totals = po.totals
    print(
        f"Totals: EXT COST {totals.ext_cost}, CTNS {totals.cartons}, "
        f"EXT QTY {totals.ext_qty}, KG {totals.kilograms}"
    )
    flags = all_flags(po)
    print(f"Flags: {len(flags)}")
    for message in flags:
        print(f"  FLAG {message}")
    return EXIT_FLAGGED if flags else EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
