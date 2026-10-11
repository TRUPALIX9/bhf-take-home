/**
 * Toolbar at the top of the PO list card, in the order people use it:
 * search, then status, then the Filters panel, then how many POs match.
 * Async Server Component that works out the status counts and the filter options; its
 * Suspense boundary isn't keyed by the filters, so it stays on screen while the table reloads.
 * getOrders() is cached per request, so the data is read once.
 */

import { FiltersMenu } from "@/components/FiltersMenu";
import { SearchBox } from "@/components/SearchBox";
import { StatusSelect } from "@/components/StatusSelect";
import { filterOptions, matches, type ListFilters } from "@/lib/filters";
import { getOrders } from "@/lib/orders";

/** Search, status (counts follow the other filters), Filters (options follow everything else). */
export async function OrdersToolbar({ filters }: { filters: ListFilters }) {
  const orders = await getOrders();
  // Status counts: everything that passes the other filters, split by status.
  const inView = orders.filter((o) => matches(o, { ...filters, status: undefined }));
  const count = (status: string) => inView.filter((o) => o.status === status).length;
  const shown = filters.status ? count(filters.status) : inView.length;

  return (
    <div className="flex flex-col gap-2 border-b border-line p-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-72">
          <SearchBox param="q" label="Search purchase orders" placeholder="PO, vendor, SKU, item…" />
        </div>
        <StatusSelect
          counts={{ all: inView.length, pending: count("pending"), approved: count("approved"), needs_correction: count("needs_correction") }}
        />
        <div className="ml-auto">
          <FiltersMenu options={filterOptions(orders, filters)} />
        </div>
      </div>
      {/* How many POs match everything above, so an empty or narrow result is never a surprise. */}
      <p className="text-xs text-muted" data-testid="result-count">
        Showing {shown} of {orders.length} purchase orders
      </p>
    </div>
  );
}
