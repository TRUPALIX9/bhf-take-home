/**
 * Body of the PO detail page (app/orders/[poNumber]/page.tsx). Async Server Component:
 * it awaits the order on the server and ships no JS of its own. Only ReviewPanel,
 * which holds the button, is a Client Component.
 *
 * Layout follows what a reviewer needs, in order:
 *   1. Who and what state: PO number, status, vendor, the Approve button, the step tracker.
 *   2. The facts that decide approval: total, whether the lines add up, when and how it ships, who bought it.
 *   3. The evidence: line items, each with a bar for its share of the PO total.
 *   4. Reference: the three addresses, in a side column (below the table on smaller screens).
 * Each fact appears once.
 */

import { notFound } from "next/navigation";
import { ReviewPanel } from "@/components/ReviewPanel";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/Card";
import { Meter } from "@/components/ui/Meter";
import { Td, Th } from "@/components/ui/table";
import {
  formatAddressLine,
  formatCount,
  formatDate,
  formatMoney,
  formatPercent,
  formatUnitCost,
  lineTotals,
  splitCode,
  titleCase,
  vendorName,
  vendorNumber,
} from "@/lib/format";
import { getOrder } from "@/lib/orders";

/** Everything on the PO page below the breadcrumb. Streams in behind OrderDetailSkeleton. */
export async function OrderDetail({ poNumber }: { poNumber: string }) {
  // --- Data ---
  const order = await getOrder(poNumber);
  // The page already returned a real 404 via orderExists(); this only guards the type.
  if (!order) notFound();

  const totals = lineTotals(order.lines);
  // Recompute the total from the lines and compare it with the PO header total.
  const totalsMatch = totals.extCost === order.totalCost;
  const vendorNo = vendorNumber(order);
  // Bars are scaled to the largest line so differences are easy to see; the % text is the true share.
  const largestLine = Math.max(...order.lines.map((l) => l.extCost));
  const buyer = splitCode(order.buyer); // "610 JORDAN MILLER": 610 is the buyer code

  const addresses = [
    ["Vendor", order.vendor],
    ["Ship to", order.shipTo],
    ["Bill to", order.billTo],
  ] as const;

  // --- Render ---
  return (
    <div className="flex flex-col gap-6 motion-safe:animate-fade-in">
      {/* 1. Who and what state: title, badge, button, step tracker (client side) */}
      <ReviewPanel
        poNumber={order.poNumber}
        status={order.status}
        subtitle={`${titleCase(vendorName(order))}${vendorNo ? ` · Vendor #${vendorNo}` : ""}`}
        poDate={formatDate(order.poDate)}
        lineCount={order.lines.length}
        totalsMatch={totalsMatch}
      />

      {/* 2. Facts that decide approval, most important first. Green/red only on the check. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total cost"
          value={formatMoney(order.totalCost)}
          note={`${order.lines.length} SKUs · ${formatCount(totals.extQty)} units · ${formatCount(totals.cartons)} cartons`}
        />
        <StatCard
          label="Line check"
          value={totalsMatch ? "✓ Matches" : "✗ Mismatch"}
          note={totalsMatch ? "Lines add up to the PO total" : `Lines add up to ${formatMoney(totals.extCost)}`}
          tone={totalsMatch ? "approved" : "danger"}
        />
        <StatCard label="Ships" value={formatDate(order.shipDate)} note={order.shipTerms} />
        <StatCard
          label="Buyer"
          value={titleCase(buyer.name)}
          note={`${buyer.code ? `Buyer #${buyer.code} · ` : ""}Ref master PO ${order.refMasterPo}`}
        />
      </div>

      {/* 3 + 4. Line items, with addresses beside them on wide screens */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <section aria-labelledby="lines-heading" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="lines-heading" className="text-base font-semibold">
              Line items <span className="num font-normal text-muted">· {order.lines.length}</span>
            </h2>
            <p className="text-xs text-muted">Bars compare lines by cost · % is the share of the PO total</p>
          </div>
          {/* Wide table scrolls inside its own box; tabIndex and role let keyboard users scroll it. */}
          <div
            className="overflow-x-auto rounded-lg border border-line"
            role="region"
            tabIndex={0}
            aria-label="Line items, scrolls sideways"
          >
            <table className="w-full min-w-[46rem]">
              <caption className="sr-only">Line items for {order.poNumber}</caption>
              <thead className="bg-subtle">
                <tr>
                  <Th>Item</Th>
                  <Th align="right">Retail</Th>
                  <Th align="right">Unit cost</Th>
                  <Th align="right">Units</Th>
                  <Th align="right">Ext cost</Th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l) => {
                  const share = l.extCost / order.totalCost;
                  return (
                    <tr key={l.sku} className="border-t border-line">
                      {/* What it is first; the codes a person might search for go underneath. */}
                      <Td>
                        <span className="block font-medium">{l.description}</span>
                        <span className="block font-mono text-xs text-muted">
                          SKU {l.sku} · UPC {l.upc} · Part {l.vendorPart} · Dept {l.dept}
                        </span>
                      </Td>
                      <Td align="right">{formatMoney(l.retail)}</Td>
                      <Td align="right">{formatUnitCost(l.cost)}</Td>
                      <Td align="right" className="whitespace-nowrap">
                        <span className="block">{formatCount(l.extQty)}</span>
                        <span className="block text-xs text-muted">
                          {formatCount(l.cartons)} ctns × {l.casePack}
                        </span>
                      </Td>
                      <Td align="right" className="w-44">
                        <span className="block font-medium">{formatMoney(l.extCost)}</span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <Meter share={l.extCost / largestLine} label={`${formatPercent(share)} of the PO total`} />
                          <span className="w-9 shrink-0 text-xs text-muted">{formatPercent(share)}</span>
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row: recomputed from the lines, to compare with the PO header */}
              <tfoot className="border-t border-line-strong bg-subtle font-semibold">
                <tr>
                  <Td>Total</Td>
                  <Td />
                  <Td />
                  <Td align="right" className="whitespace-nowrap">
                    <span className="block">{formatCount(totals.extQty)}</span>
                    <span className="block text-xs font-normal text-muted">{formatCount(totals.cartons)} ctns</span>
                  </Td>
                  <Td align="right">
                    <span data-testid="lines-total">{formatMoney(totals.extCost)}</span>
                  </Td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* 4. Reference: addresses as printed on the PO, phone numbers made readable */}
        <aside className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 xl:content-start" aria-label="Addresses">
          {addresses.map(([label, lines]) => (
            <Card key={label} title={label}>
              <address className="flex flex-col text-muted not-italic">
                {lines.map((line, i) => (
                  // Index key: two address lines can be identical text.
                  <span key={i} className={i === 0 ? "font-medium text-ink" : undefined}>
                    {formatAddressLine(line)}
                  </span>
                ))}
              </address>
            </Card>
          ))}
        </aside>
      </div>
    </div>
  );
}
