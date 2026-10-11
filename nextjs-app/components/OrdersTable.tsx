/**
 * The PO list on the home page. Async Server Component.
 * app/page.tsx keys its Suspense boundary by the filter, so changing tabs remounts
 * only this part; the summary above stays on screen.
 *
 * Columns, in reading order: which PO and its status, who it is from and where, when it
 * ships, how big it is. The vendor's origin sits under its name, and each total has a bar
 * showing its share of everything on order, so the big POs stand out without reading digits.
 */

import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { linkClass } from "@/components/ui/Button";
import { Meter } from "@/components/ui/Meter";
import { Td, Th } from "@/components/ui/table";
import { formatDate, formatMoney, formatPercent, titleCase, vendorName } from "@/lib/format";
import { getOrders } from "@/lib/orders";
import type { ReviewStatus } from "@/lib/types";

/** The order list for one filter. The only part that reloads when the tab changes. */
export async function OrdersTable({ filter }: { filter?: ReviewStatus }) {
  // --- Data ---
  const orders = await getOrders();
  const shown = filter ? orders.filter((o) => o.status === filter) : orders;
  // Shares are of everything on order, so the bars mean the same thing on every tab.
  const grandTotal = orders.reduce((t, o) => t + o.totalCost, 0);
  const shareOf = (total: number) => total / grandTotal;
  // Bars are scaled to the largest PO so differences are easy to see; the % text is the true share.
  const largest = Math.max(...orders.map((o) => o.totalCost));

  // --- Render ---
  if (shown.length === 0) {
    return <p className="py-10 text-center text-muted">No orders with this status.</p>;
  }

  return (
    <div className="motion-safe:animate-fade-in">
      {/* Desktop: table (hidden below md) */}
      <table className="hidden w-full md:table">
        <caption className="sr-only">Purchase orders</caption>
        <thead>
          <tr className="border-b border-line">
            <Th>PO number</Th>
            <Th>Status</Th>
            <Th>Vendor</Th>
            <Th>Ship date</Th>
            <Th align="right">Lines</Th>
            <Th align="right">Total cost</Th>
          </tr>
        </thead>
        <tbody>
          {shown.map((o) => (
            <tr key={o.poNumber} className="border-b border-line transition-colors hover:bg-subtle">
              <Td mono>
                <Link href={`/orders/${o.poNumber}`} className={linkClass}>
                  {o.poNumber}
                </Link>
              </Td>
              <Td>
                <StatusBadge status={o.status} />
              </Td>
              <Td>
                <span className="block font-medium">{titleCase(vendorName(o))}</span>
                <span className="block text-xs text-muted">{o.shipTerms}</span>
              </Td>
              <Td className="whitespace-nowrap">{formatDate(o.shipDate)}</Td>
              <Td align="right">{o.lines.length}</Td>
              <Td align="right" className="w-52">
                <span className="block font-medium">{formatMoney(o.totalCost)}</span>
                {/* Share of all orders: the bar, then the same number as text */}
                <span className="mt-1.5 flex items-center gap-2">
                  <Meter share={o.totalCost / largest} label={`${formatPercent(shareOf(o.totalCost))} of all orders by value`} />
                  <span className="w-9 shrink-0 text-xs text-muted">{formatPercent(shareOf(o.totalCost))}</span>
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone: one row per order (hidden from md up); the whole row is the link */}
      <ul className="flex flex-col md:hidden">
        {shown.map((o) => (
          <li key={o.poNumber} className="border-b border-line">
            <Link href={`/orders/${o.poNumber}`} className="flex flex-col gap-1.5 py-3">
              <span className="flex items-center justify-between gap-3">
                <span className="font-mono font-medium text-accent">{o.poNumber}</span>
                <StatusBadge status={o.status} />
              </span>
              <span className="font-medium">{titleCase(vendorName(o))}</span>
              <span className="flex justify-between text-muted">
                <span>Ships {formatDate(o.shipDate)}</span>
                <span className="num font-medium text-ink">{formatMoney(o.totalCost)}</span>
              </span>
              <Meter share={o.totalCost / largest} label={`${formatPercent(shareOf(o.totalCost))} of all orders by value`} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
