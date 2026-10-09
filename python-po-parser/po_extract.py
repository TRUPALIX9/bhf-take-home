"""Turn the sample purchase order text file into the output template spreadsheet.

Written for this one PO layout, on purpose. Sections, in order:
model, parse, validate, write, main.
"""

import argparse
import json
import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, PatternFill

HERE = Path(__file__).resolve().parent
DEFAULT_INPUT = HERE / "input" / "purchase_order_sample.txt"
DEFAULT_TEMPLATE = HERE / "input" / "output_template_blank.xlsx"
DEFAULT_OUTPUT = HERE / "output" / "purchase_order_sample.xlsx"

# Header fields. A value ends at a run of 2+ spaces, where the next column starts.
BUYER_RE = re.compile(r"BUYER: (?P<value>.+?)(?: {2,}|$)")
SHIP_TERMS_RE = re.compile(r"SHIP TERMS: (?P<value>.+?)(?: {2,}|$)")
PO_NUMBER_RE = re.compile(r"(?<!MASTER )PO#: (?P<value>\S+)")
REF_MASTER_PO_RE = re.compile(r"REF MASTER PO#: (?P<value>\S+)")
SHIP_DATE_RE = re.compile(r"SHIP DATE: (?P<value>\d{1,2}/\d{1,2}/\d{2})$")
PO_DATE_RE = re.compile(r" (?P<value>\d{1,2}/\d{1,2}/\d{4})$")

# One item row: three text columns, a description with spaces, then nine numbers.
ITEM_RE = re.compile(
    r"^(?P<dept>\d{3}) +"
    r"(?P<sku>\d+) +"
    r"(?P<vendor_part>\S+) +"
    r"(?P<description>.+?) +"  # lazy, so it stops before the first number
    r"(?P<retail>\d+\.\d+) +"
    r"(?P<cost>\d+\.\d+) +"
    r"(?P<ext_cost>\d+\.\d+) +"
    r"(?P<cartons>\d+) +"
    r"(?P<case_pack>\d+) +"
    r"(?P<ext_qty>\d+) +"
    r"(?P<cube>\d+\.\d+) +"
    r"(?P<kilograms>\d+\.\d+)$"
)
# The UPC sits alone on the line right under its item row, indented 4 spaces.
UPC_RE = re.compile(r"^ {4}(?P<upc>\d{12,14})$")
# The TOTALS numbers are not aligned under their columns, so read them in order.
TOTALS_RE = re.compile(
    r"^TOTALS: +(?P<ext_cost>\d+\.\d+) +(?P<cartons>\d+) +"
    r"(?P<ext_qty>\d+) +(?P<kilograms>\d+\.\d+)$"
)


# ---------------------------------------------------------------- model


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
    column: str  # template column the problem belongs to
    message: str


# ---------------------------------------------------------------- parse


def parse(text: str) -> PurchaseOrder:
    """Parse the whole purchase order text."""
    lines = text.splitlines()
    return PurchaseOrder(
        header=parse_header(lines),
        items=parse_items(lines),
        totals=parse_totals(lines),
    )


def parse_header(lines: list[str]) -> Header:
    """Read the labeled fields and the three address blocks."""
    ship_to, bill_to = read_side_by_side_blocks(lines, "SHIP TO", "BILL TO")
    return Header(
        po_number=find_value(lines, PO_NUMBER_RE, "PO#"),
        ref_master_po=find_value(lines, REF_MASTER_PO_RE, "REF MASTER PO#"),
        po_date=to_date(find_value(lines, PO_DATE_RE, "PO date"), "%m/%d/%Y"),
        ship_date=to_date(find_value(lines, SHIP_DATE_RE, "SHIP DATE"), "%m/%d/%y"),
        buyer=find_value(lines, BUYER_RE, "BUYER"),
        ship_terms=find_value(lines, SHIP_TERMS_RE, "SHIP TERMS"),
        vendor=read_block(lines, "VENDOR"),
        ship_to=ship_to,
        bill_to=bill_to,
    )


def find_value(lines: list[str], pattern: re.Pattern, name: str) -> str:
    """Return the 'value' group of the first line that matches."""
    for line in lines:
        match = pattern.search(line)
        if match:
            return match["value"].strip()
    raise ValueError(f"header field {name} not found")


def to_date(text: str, date_format: str) -> date:
    """Turn a printed date like 5/02/26 into a real date."""
    return datetime.strptime(text, date_format).date()


def find_block_start(lines: list[str], title: str) -> int:
    """Index of the title line of a block that is underlined with dashes."""
    for index, line in enumerate(lines[:-1]):
        if line.startswith(title) and lines[index + 1].startswith("-"):
            return index
    raise ValueError(f"block {title} not found")


def read_block(lines: list[str], title: str) -> tuple[str, ...]:
    """The lines under a block's dashes, up to the first blank line."""
    start = find_block_start(lines, title) + 2
    block = []
    for line in lines[start:]:
        if not line.strip():
            break
        block.append(line.strip())
    return tuple(block)


def read_side_by_side_blocks(
    lines: list[str], left_title: str, right_title: str
) -> tuple[tuple[str, ...], tuple[str, ...]]:
    """Two blocks printed next to each other: split each line where the right title starts."""
    title_index = find_block_start(lines, left_title)
    split_at = lines[title_index].index(right_title)
    left, right = [], []
    for line in lines[title_index + 2 :]:
        if not line.strip():
            break
        if line[:split_at].strip():
            left.append(line[:split_at].strip())
        if line[split_at:].strip():
            right.append(line[split_at:].strip())
    return tuple(left), tuple(right)


def parse_items(lines: list[str]) -> tuple[LineItem, ...]:
    """Every item row, each paired with the UPC on the line below it."""
    items = []
    for index, line in enumerate(lines):
        match = ITEM_RE.match(line)
        if not match:
            continue
        next_line = lines[index + 1] if index + 1 < len(lines) else ""
        upc_match = UPC_RE.match(next_line)
        if not upc_match:
            raise ValueError(f"item SKU {match['sku']} has no UPC line under it")
        items.append(
            LineItem(
                dept=match["dept"],
                sku=match["sku"],
                upc=upc_match["upc"],
                vendor_part=match["vendor_part"],
                description=match["description"],
                retail=Decimal(match["retail"]),
                cost=Decimal(match["cost"]),
                ext_cost=Decimal(match["ext_cost"]),
                cartons=int(match["cartons"]),
                case_pack=int(match["case_pack"]),
                ext_qty=int(match["ext_qty"]),
                cube=Decimal(match["cube"]),
                kilograms=Decimal(match["kilograms"]),
            )
        )
    return tuple(items)


def parse_totals(lines: list[str]) -> Totals:
    """The printed TOTALS line at the bottom of the item table."""
    for line in lines:
        match = TOTALS_RE.match(line)
        if match:
            return Totals(
                ext_cost=Decimal(match["ext_cost"]),
                cartons=int(match["cartons"]),
                ext_qty=int(match["ext_qty"]),
                kilograms=Decimal(match["kilograms"]),
            )
    raise ValueError("TOTALS line not found")


# ---------------------------------------------------------------- validate


def check_item(item: LineItem) -> list[Flag]:
    """Recompute EXT QTY and EXT Cost and flag any that differ from the print."""
    flags = []
    expected_qty = item.cartons * item.case_pack
    if expected_qty != item.ext_qty:
        flags.append(
            Flag("EXT QTY", f"printed {item.ext_qty}, CTNS x CSPK = {expected_qty}")
        )
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
    """Every problem in the order, as one printable line each."""
    messages = [
        f"SKU {item.sku} {flag.column}: {flag.message}"
        for item in po.items
        for flag in check_item(item)
    ]
    return messages + check_totals(po)


# ---------------------------------------------------------------- write

FLAG_FILL = PatternFill(fill_type="solid", fgColor="FFC7CE")
TEXT_FORMAT = "@"
NUMBER_FORMATS = {
    "SHIP DATE": "m/d/yyyy",
    "Retail": "0.00",
    "Cost": "0.000",
    "EXT Cost": "#,##0.000",
    "CTNS": "0",
    "CSPK": "0",
    "EXT QTY": "0",
    "Cube": "0.0000",
    "Kilograms": "0.00",
    "Total Cost": "#,##0.00",
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


def mark_flag(cell, message: str) -> None:
    """Show a validation problem on the cell itself: red fill plus a comment."""
    cell.fill = FLAG_FILL
    cell.comment = Comment(message, "po_extract")


def write_xlsx(po: PurchaseOrder, filename: str, template: Path, output: Path) -> None:
    """Fill a copy of the template, one row per item, and save it to output."""
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
            mark_flag(sheet.cell(row, columns.index(flag.column) + 1), flag.message)
    output.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output)


def order_json(po: PurchaseOrder) -> dict:
    """The order in the shape of the Next.js app's Order type."""
    header = po.header
    return {
        "poNumber": header.po_number,
        "refMasterPo": header.ref_master_po,
        "poDate": header.po_date.isoformat(),
        "shipDate": header.ship_date.isoformat(),
        "buyer": header.buyer,
        "shipTerms": header.ship_terms,
        "vendor": list(header.vendor),
        "shipTo": list(header.ship_to),
        "billTo": list(header.bill_to),
        "totalCost": float(po.totals.ext_cost),
        "status": "pending",
        "lines": [
            {
                "dept": item.dept,
                "sku": item.sku,
                "upc": item.upc,
                "vendorPart": item.vendor_part,
                "description": item.description,
                "retail": float(item.retail),
                "cost": float(item.cost),
                "extCost": float(item.ext_cost),
                "cartons": item.cartons,
                "casePack": item.case_pack,
                "extQty": item.ext_qty,
                "cube": float(item.cube),
                "kilograms": float(item.kilograms),
            }
            for item in po.items
        ],
    }


def write_json(po: PurchaseOrder, output: Path) -> None:
    """Save the order as JSON (the seed for the Next.js app)."""
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(order_json(po), indent=2) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- main


def parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--json",
        action="store_true",
        help="also write <PO#>.json next to the output spreadsheet",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Parse, validate, write. Exit code 1 if anything was flagged."""
    args = parse_args(argv)
    po = parse(args.input.read_text(encoding="utf-8"))
    write_xlsx(po, args.input.name, args.template, args.output)
    print(f"PO {po.header.po_number}: {len(po.items)} rows -> {args.output}")

    if args.json:
        json_path = args.output.parent / f"{po.header.po_number}.json"
        write_json(po, json_path)
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
    return 1 if flags else 0


if __name__ == "__main__":
    raise SystemExit(main())
