/**
 * Toolbar at the top of the PO list card: status tabs on the left, the Filters menu on the
 * right (stacked on phones). Async Server Component that works out the tab counts and the
 * facet options from the current filters; its Suspense boundary isn't keyed by the filters,
 * so it stays on screen while the table reloads. getOrders() is cached per request.
 */

import { FiltersMenu } from "@/components/FiltersMenu";
import { StatusTabs } from "@/components/StatusTabs";
import { filterOptions, matches, type ListFilters } from "@/lib/filters";
import { getOrders } from "@/lib/orders";

/** Tabs (counts follow the facet filters) and the Filters menu (options follow the tab). */
export async function OrdersToolbar({ filters }: { filters: ListFilters }) {
  const orders = await getOrders();
  // Tab counts: everything that passes the facets, split by status.
  const inView = orders.filter((o) => matches(o, { ...filters, status: undefined }));
  const count = (status: string) => inView.filter((o) => o.status === status).length;

  return (
    <div className="flex flex-col gap-2 border-b border-line md:flex-row md:items-center md:justify-between md:pr-4">
      <StatusTabs
        counts={{ all: inView.length, pending: count("pending"), approved: count("approved"), needs_correction: count("needs_correction") }}
      />
      <div className="px-4 pb-3 md:p-0">
        <FiltersMenu options={filterOptions(orders, filters)} />
      </div>
    </div>
  );
}
