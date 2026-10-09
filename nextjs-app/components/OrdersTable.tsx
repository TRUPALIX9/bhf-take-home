import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { linkClass } from "@/components/ui/Button";
import { Td, Th } from "@/components/ui/table";
import { formatDate, formatMoney, vendorName } from "@/lib/format";
import { getOrders } from "@/lib/orders";
import type { ReviewStatus } from "@/lib/types";

/** The order list for one filter. The only part that reloads when the tab changes. */
export async function OrdersTable({ filter }: { filter?: ReviewStatus }) {
  const orders = await getOrders();
  const shown = filter ? orders.filter((o) => o.status === filter) : orders;

  if (shown.length === 0) {
    return <p className="py-10 text-center text-muted">No orders with this status.</p>;
  }

  return (
    <div className="motion-safe:animate-fade-in">
      {/* Desktop: table */}
      <table className="hidden w-full md:table">
        <caption className="sr-only">Purchase orders</caption>
        <thead>
          <tr className="border-b border-line">
            <Th>PO number</Th>
            <Th>Vendor</Th>
            <Th>Ships from</Th>
            <Th>Ship date</Th>
            <Th align="right">Lines</Th>
            <Th align="right">Total cost</Th>
            <Th>Status</Th>
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
              <Td>{vendorName(o)}</Td>
              <Td className="text-muted">{o.shipTerms}</Td>
              <Td className="whitespace-nowrap">{formatDate(o.shipDate)}</Td>
              <Td align="right">{o.lines.length}</Td>
              <Td align="right" className="font-medium">
                {formatMoney(o.totalCost)}
              </Td>
              <Td>
                <StatusBadge status={o.status} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone: one row per order */}
      <ul className="flex flex-col md:hidden">
        {shown.map((o) => (
          <li key={o.poNumber} className="border-b border-line">
            <Link href={`/orders/${o.poNumber}`} className="flex flex-col gap-1.5 py-3">
              <span className="flex items-center justify-between gap-3">
                <span className="font-mono font-medium text-accent">{o.poNumber}</span>
                <StatusBadge status={o.status} />
              </span>
              <span>{vendorName(o)}</span>
              <span className="flex justify-between text-muted">
                <span>Ships {formatDate(o.shipDate)}</span>
                <span className="num font-medium text-ink">{formatMoney(o.totalCost)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
