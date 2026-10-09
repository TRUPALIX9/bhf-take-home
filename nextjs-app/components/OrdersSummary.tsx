import { StatCard } from "@/components/StatCard";
import { StatusTabs } from "@/components/StatusTabs";
import { formatCount, formatDate, formatMoney } from "@/lib/format";
import { getOrders } from "@/lib/orders";

/**
 * Stat cards and tab counts. They don't depend on the filter, so this part
 * stays on screen while the table below reloads.
 */
export async function OrdersSummary() {
  const orders = await getOrders();
  const pending = orders.filter((o) => o.status === "pending");
  const approved = orders.length - pending.length;
  const totalCost = orders.reduce((t, o) => t + o.totalCost, 0);
  const units = orders.reduce((t, o) => t + o.lines.reduce((u, l) => u + l.extQty, 0), 0);
  const nextShip = pending[0]; // orders are sorted by ship date

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pending review"
          value={pending.length}
          note={pending.length === 1 ? "order waiting" : "orders waiting"}
        />
        <StatCard
          label="Approved"
          value={approved}
          note={`of ${orders.length} orders`}
          testId="approved-count"
        />
        <StatCard label="Total on order" value={formatMoney(totalCost)} note={`${formatCount(units)} units`} />
        <StatCard
          label="Next to ship"
          value={nextShip ? formatDate(nextShip.shipDate) : "—"}
          note={nextShip ? `${nextShip.poNumber}, still pending` : "Nothing pending"}
        />
      </div>
      <StatusTabs counts={{ all: orders.length, pending: pending.length, approved }} />
    </div>
  );
}
