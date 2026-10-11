/**
 * The purchase order itself, laid out like the printed document a buyer or vendor
 * already knows: issuer and "PURCHASE ORDER" header, the three address blocks, a terms
 * strip, the line items in the PO's own column order, and totals at the bottom right.
 * Server Component, no hooks. Used by OrderDetail.
 */

import Link from "next/link";
import { linkClass } from "@/components/ui/Button";
import { SortTh, Td, Th } from "@/components/ui/table";
import {
  formatAddressLine,
  formatCount,
  formatDate,
  formatMoney,
  formatUnitCost,
  lineTotals,
  splitCode,
  titleCase,
} from "@/lib/format";
import { lineSortHref, nextLineSort, sortLines, type LineSort, type LineSortKey } from "@/lib/lineSort";
import type { Order } from "@/lib/types";

/** Small uppercase label used for every field name on the document, as on a printed form. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium tracking-wide text-muted uppercase">{children}</span>;
}

/** One address block: label, first line (the party) emphasized, the rest as printed. */
function AddressBlock({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 p-4">
      <FieldLabel>{label}</FieldLabel>
      <address className="flex flex-col not-italic">
        {lines.map((line, i) => (
          // Index key: two address lines can be identical text.
          <span key={i} className={i === 0 ? "font-semibold" : "text-muted"}>
            {formatAddressLine(line)}
          </span>
        ))}
      </address>
    </div>
  );
}

/** The whole PO as a document card. */
export function PurchaseOrderDocument({
  order,
  masterCount,
  lineSort,
}: {
  order: Order;
  masterCount: number;
  lineSort: LineSort;
}) {
  // --- Data ---
  const totals = lineTotals(order.lines);
  const lines = sortLines(order.lines, lineSort);
  // Sortable header for a line-item column; clicking cycles sorted, reversed, printed order.
  const sortTh = (label: string, key: LineSortKey, align?: "left" | "right", hint?: string) => (
    <SortTh
      dense
      label={label}
      hint={hint}
      href={lineSortHref(order.poNumber, nextLineSort(lineSort, key))}
      dir={lineSort?.key === key ? lineSort.dir : undefined}
      align={align}
    />
  );
  const buyer = splitCode(order.buyer); // "610 JORDAN MILLER": 610 is the buyer code
  // The PO is issued by the bill-to party: "331 MERIDIAN SOURCING CO. INC." -> "Meridian Sourcing Co. Inc."
  const issuer = titleCase(splitCode(order.billTo[0]).name);

  const terms: [string, React.ReactNode][] = [
    ["PO date", formatDate(order.poDate)],
    ["Ship date", formatDate(order.shipDate)],
    ["Ship terms", order.shipTerms],
    [
      "Ref master PO",
      // The master PO is the parent order this PO belongs to. It has no document of its own
      // ("for reference only" on the PO), so the link lists every PO that shares it.
      <Link key="master" href={`/?master=${order.refMasterPo}`} className={linkClass}>
        {order.refMasterPo}
        <span className="ml-1.5 text-xs font-normal text-muted">
          {masterCount} {masterCount === 1 ? "PO" : "POs"} →
        </span>
      </Link>,
    ],
  ];

  // --- Render ---
  return (
    <article aria-label={`Purchase order ${order.poNumber}`} className="overflow-hidden rounded-lg border border-line-strong bg-surface">
      {/* Header: issuer and buyer on the left, document title and number on the right */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line-strong p-5">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold">{issuer}</span>
          <span className="text-muted">
            Buyer: {titleCase(buyer.name)}
            {buyer.code && <span className="num"> (#{buyer.code})</span>}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Purchase order</span>
          <span className="font-mono text-2xl font-semibold">{order.poNumber}</span>
        </div>
      </header>

      {/* Parties: vendor, ship to, bill to side by side, as on the printed PO */}
      <div className="grid divide-y divide-line border-b border-line-strong sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <AddressBlock label="Vendor" lines={order.vendor} />
        <AddressBlock label="Ship to" lines={order.shipTo} />
        <AddressBlock label="Bill to" lines={order.billTo} />
      </div>

      {/* Terms strip */}
      <dl className="grid grid-cols-2 divide-line border-b border-line-strong bg-subtle sm:grid-cols-4 sm:divide-x">
        {terms.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 px-4 py-3">
            <dt>
              <FieldLabel>{label}</FieldLabel>
            </dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Line items in the PO's own column order; ext cost and ext qty sort. Wide, so it scrolls inside its own box. */}
      <div className="relative overflow-x-auto" role="region" tabIndex={0} aria-label="Line items, scrolls sideways">
        <table className="w-full min-w-[60rem]">
          <caption className="sr-only">Line items for {order.poNumber}</caption>
          <thead className="border-b border-line">
            <tr>
              {/* Plain names; the hint (tooltip) says what each means and what the PO calls it. */}
              <Th dense hint="Department number on the PO (DPT)">Dept</Th>
              <Th dense hint="Our item number (SKU) and the barcode number (UPC) under it">SKU / UPC</Th>
              <Th dense hint="The vendor's own number for this item (VENDOR PART#)">Vendor part</Th>
              <Th dense>Description</Th>
              <Th dense align="right" hint="Price the item sells for in store (RETAIL)">Retail price</Th>
              <Th dense align="right" hint="What we pay the vendor for one unit (COST)">Unit cost</Th>
              {sortTh("Line cost", "extCost", "right", "Unit cost × units: what this line costs (EXT COST)")}
              <Th dense align="right" hint="Number of cartons shipped (CTNS)">Cartons</Th>
              <Th dense align="right" hint="Units packed in each carton (CSPK, case pack)">Per carton</Th>
              {sortTh("Units", "extQty", "right", "Cartons × per carton: total units on this line (EXT QTY)")}
              <Th dense align="right" hint="Space one carton takes, as printed on the PO (CUBE)">Carton volume</Th>
              <Th dense align="right" hint="Weight of one carton in kilograms, as printed on the PO (KILOGRAMS)">Carton kg</Th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              // Light zebra rows help the eye follow a wide row across.
              <tr key={l.sku} className={`border-t border-line ${i % 2 ? "bg-subtle/60" : ""}`}>
                <Td dense mono>{l.dept}</Td>
                <Td dense mono>
                  <span className="block">{l.sku}</span>
                  <span className="block text-xs text-muted">{l.upc}</span>
                </Td>
                <Td dense mono>{l.vendorPart}</Td>
                <Td dense className="whitespace-nowrap">{l.description}</Td>
                <Td dense align="right">{formatMoney(l.retail)}</Td>
                <Td dense align="right">{formatUnitCost(l.cost)}</Td>
                <Td dense align="right" className="font-medium">
                  {formatMoney(l.extCost)}
                </Td>
                <Td dense align="right">{formatCount(l.cartons)}</Td>
                <Td dense align="right">{l.casePack}</Td>
                <Td dense align="right">{formatCount(l.extQty)}</Td>
                <Td dense align="right" className="text-muted">
                  {l.cube.toFixed(4)}
                </Td>
                <Td dense align="right" className="text-muted">
                  {l.kilograms.toFixed(2)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals at the bottom right, like the foot of the printed PO */}
      <footer className="flex justify-end border-t border-line-strong p-5">
        <dl className="grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5">
          <dt className="text-muted">Total cartons</dt>
          <dd className="num text-right">{formatCount(totals.cartons)}</dd>
          <dt className="text-muted">Total units</dt>
          <dd className="num text-right">{formatCount(totals.extQty)}</dd>
          <dt className="text-muted">Total kilograms</dt>
          <dd className="num text-right">{totals.kilograms.toFixed(2)}</dd>
          <dt className="mt-2 border-t border-line pt-2 font-semibold">Total invoice value</dt>
          {/* The printed total; the checks above confirm the lines add up to it. */}
          <dd className="num mt-2 border-t border-line pt-2 text-right text-lg font-semibold" data-testid="lines-total">
            {formatMoney(order.totalCost)}
          </dd>
        </dl>
      </footer>
    </article>
  );
}
