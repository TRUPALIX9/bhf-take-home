/**
 * Top of the PO list (app/page.tsx): headline numbers, review progress by value, and
 * the status tabs. Async Server Component inside its own Suspense boundary; StatusTabs
 * is the client part. Order of importance, left to right: what needs work, what is done,
 * how much money is involved, and what ships next.
 */

import { StatCard } from "@/components/StatCard";
import { StatusTabs } from "@/components/StatusTabs";
import { Card } from "@/components/ui/Card";
import { SegmentedBar } from "@/components/ui/Meter";
import { formatCount, formatDate, formatMoney, formatPercent } from "@/lib/format";
import { getOrders } from "@/lib/orders";

/**
 * Stat cards, progress bar and tab counts. They don't depend on the filter, so this
 * part stays on screen while the table below reloads.
 */
export async function OrdersSummary() {
  // --- Data ---
  const orders = await getOrders();
  const pending = orders.filter((o) => o.status === "pending");
  const approved = orders.length - pending.length;
  const totalCost = orders.reduce((t, o) => t + o.totalCost, 0);
  const pendingCost = pending.reduce((t, o) => t + o.totalCost, 0);
  const approvedCost = totalCost - pendingCost;
  const units = orders.reduce((t, o) => t + o.lines.reduce((u, l) => u + l.extQty, 0), 0);
  const nextShip = pending[0]; // orders are sorted by ship date

  // --- Render ---
  return (
    <div className="flex flex-col gap-6">
      {/* Headline numbers. Color only where it signals something: amber = work waiting, green = done. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pending review"
          value={pending.length}
          note={pending.length === 1 ? "order waiting for approval" : "orders waiting for approval"}
          tone={pending.length > 0 ? "pending" : undefined}
        />
        <StatCard
          label="Approved"
          value={approved}
          note={`of ${orders.length} orders`}
          testId="approved-count"
          tone={approved > 0 ? "approved" : undefined}
        />
        <StatCard label="Total on order" value={formatMoney(totalCost)} note={`${formatCount(units)} units`} />
        <StatCard
          label="Next to ship"
          value={nextShip ? formatDate(nextShip.shipDate) : "—"}
          note={nextShip ? `${nextShip.poNumber}, still pending` : "Nothing pending"}
        />
      </div>

      {/* Review progress by money, not by count: one large PO matters more than a small one. */}
      <Card className="gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-base font-semibold">Review progress by value</h2>
          <p className="text-muted">
            <span className="num font-medium text-ink">{formatPercent(approvedCost / totalCost)}</span> of
            order value approved
          </p>
        </div>
        <SegmentedBar
          label={`${formatMoney(approvedCost)} approved, ${formatMoney(pendingCost)} pending`}
          segments={[
            { share: approvedCost / totalCost, tone: "approved" },
            { share: pendingCost / totalCost, tone: "pending" },
          ]}
        />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted">
          <span className="flex items-center gap-2">
            <span aria-hidden className="size-2 rounded-full bg-approved" />
            Approved <span className="num text-ink">{formatMoney(approvedCost)}</span>
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="size-2 rounded-full bg-pending" />
            Pending <span className="num text-ink">{formatMoney(pendingCost)}</span>
          </span>
        </div>
      </Card>

      {/* Counts are computed here on the server and passed down as plain props. */}
      <StatusTabs counts={{ all: orders.length, pending: pending.length, approved }} />
    </div>
  );
}
