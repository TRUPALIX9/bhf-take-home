import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney, vendorName } from "@/lib/format";
import { getOrders } from "@/lib/orders";

// Review status changes at runtime, so render on every request.
export const dynamic = "force-dynamic";

export default function OrdersPage() {
  const orders = getOrders();
  const approved = orders.filter((o) => o.status === "approved").length;
  const total = orders.reduce((t, o) => t + o.totalCost, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-semibold text-balance">Purchase orders</h1>
        <p className="max-w-prose text-muted">
          Vendor POs to check before they go to downstream systems. Open one to see its line
          items and approve it.
        </p>
        <p className="text-sm text-muted" data-testid="summary">
          <strong className="font-semibold text-ink">{approved}</strong> of {orders.length}{" "}
          approved · <span className="num text-ink">{formatMoney(total)}</span> on order
        </p>
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded border border-line md:block">
        <table className="w-full text-sm">
          <thead className="bg-subtle text-left">
            <tr>
              <th className="label px-4 py-3">PO #</th>
              <th className="label px-4 py-3">Vendor</th>
              <th className="label px-4 py-3">Ship date</th>
              <th className="label px-4 py-3">Ship terms</th>
              <th className="label px-4 py-3 text-right">Lines</th>
              <th className="label px-4 py-3 text-right">Total cost</th>
              <th className="label px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.poNumber} className="border-t border-line hover:bg-subtle">
                <td className="px-4 py-3">
                  <Link
                    href={`/orders/${o.poNumber}`}
                    className="num font-medium text-accent underline-offset-4 hover:underline"
                  >
                    {o.poNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{vendorName(o)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(o.shipDate)}</td>
                <td className="px-4 py-3 text-muted">{o.shipTerms}</td>
                <td className="num px-4 py-3 text-right">{o.lines.length}</td>
                <td className="num px-4 py-3 text-right">{formatMoney(o.totalCost)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked rows */}
      <ul className="flex flex-col divide-y divide-line rounded border border-line md:hidden">
        {orders.map((o) => (
          <li key={o.poNumber}>
            <Link href={`/orders/${o.poNumber}`} className="flex flex-col gap-2 p-4 hover:bg-subtle">
              <span className="flex items-center justify-between gap-3">
                <span className="num font-medium text-accent">{o.poNumber}</span>
                <StatusBadge status={o.status} />
              </span>
              <span className="text-sm">{vendorName(o)}</span>
              <span className="flex justify-between text-sm text-muted">
                <span>Ships {formatDate(o.shipDate)}</span>
                <span className="num text-ink">{formatMoney(o.totalCost)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
