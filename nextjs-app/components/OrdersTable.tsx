import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney, vendorName } from "@/lib/format";
import { getOrders } from "@/lib/orders";
import type { ReviewStatus } from "@/lib/types";

/** The order list for one filter. The only part that reloads when the tab changes. */
export async function OrdersTable({ filter }: { filter?: ReviewStatus }) {
  const orders = await getOrders();
  const shown = filter ? orders.filter((o) => o.status === filter) : orders;

  return (
    <div className="flex flex-col">
    {shown.length === 0 ? (
      <p className="py-10 text-center text-muted">No orders with this status.</p>
    ) : (
      <>
        {/* Desktop: table */}
        <table className="hidden w-full md:table">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="px-3 py-2.5 font-medium">PO number</th>
              <th className="px-3 py-2.5 font-medium">Vendor</th>
              <th className="px-3 py-2.5 font-medium">Ships from</th>
              <th className="px-3 py-2.5 font-medium">Ship date</th>
              <th className="px-3 py-2.5 text-right font-medium">Lines</th>
              <th className="px-3 py-2.5 text-right font-medium">Total cost</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.poNumber} className="border-b border-line hover:bg-subtle">
                <td className="px-3 py-3">
                  <Link
                    href={`/orders/${o.poNumber}`}
                    className="font-mono font-medium text-accent hover:underline"
                  >
                    {o.poNumber}
                  </Link>
                </td>
                <td className="px-3 py-3">{vendorName(o)}</td>
                <td className="px-3 py-3 text-muted">{o.shipTerms}</td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDate(o.shipDate)}</td>
                <td className="num px-3 py-3 text-right">{o.lines.length}</td>
                <td className="num px-3 py-3 text-right font-medium">{formatMoney(o.totalCost)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={o.status} />
                </td>
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
      </>
    )}
    </div>
  );
}
