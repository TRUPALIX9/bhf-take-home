/**
 * Toolbar at the top of the PO list card: status tabs on the left, the Filters menu on
 * the right (stacked on phones). Async Server Component that loads the counts and the
 * filter options; its Suspense boundary isn't keyed by the filters, so it stays on screen
 * while the table reloads. getOrders() is cached per request, so the data is read once.
 */

import { FiltersMenu } from "@/components/FiltersMenu";
import { StatusTabs } from "@/components/StatusTabs";
import { matches, type ListFilters } from "@/lib/filters";
import { titleCase, vendorName, vendorNumber } from "@/lib/format";
import { getOrders } from "@/lib/orders";
import { originSummary } from "@/lib/origin";

/** Tabs (counts follow the menu filters) and the Filters menu with its options. */
export async function OrdersToolbar({ filters }: { filters: ListFilters }) {
  const orders = await getOrders();
  // Tab counts: everything that passes the menu filters, split by status.
  const inView = orders.filter((o) => matches(o, { ...filters, status: undefined }));
  const pending = inView.filter((o) => o.status === "pending").length;

  // Options for the menu, each with how many POs it would show.
  const countries = originSummary(orders).map((c) => ({ value: c.code, label: c.name, count: c.count }));
  const vendorCounts = new Map<string, { label: string; count: number }>();
  for (const o of orders) {
    const code = vendorNumber(o);
    if (!code) continue;
    const entry = vendorCounts.get(code) ?? { label: titleCase(vendorName(o)), count: 0 };
    entry.count += 1;
    vendorCounts.set(code, entry);
  }
  const vendors = [...vendorCounts]
    .map(([value, v]) => ({ value, ...v }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex flex-col gap-2 border-b border-line md:flex-row md:items-center md:justify-between md:pr-4">
      <StatusTabs counts={{ all: inView.length, pending, approved: inView.length - pending }} />
      <div className="px-4 pb-3 md:p-0">
        <FiltersMenu countries={countries} vendors={vendors} />
      </div>
    </div>
  );
}
