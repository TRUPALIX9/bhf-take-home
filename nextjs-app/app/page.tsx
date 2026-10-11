/**
 * PO list: the home route "/". Server Component.
 * The heading renders at once; the toolbar and the table stream in behind their own
 * skeletons. Search, status, filters, sort and page come from the URL
 * (?status=pending&country=CHN&vendor=50201&sort=total&dir=desc&page=2&per=25), so every view is a shareable link.
 */
import { Suspense } from "react";
import { OrdersTable } from "@/components/OrdersTable";
import { OrdersToolbar } from "@/components/OrdersToolbar";
import { TableSkeleton, ToolbarSkeleton } from "@/components/Skeletons";
import { parseFilters } from "@/lib/filters";
import { parsePaging } from "@/lib/paginate";
import { parseSort } from "@/lib/sort";

// Review status changes at runtime, so render on every request instead of prerendering.
export const dynamic = "force-dynamic";

// In Next 15 searchParams is a Promise.
type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    country?: string;
    vendor?: string;
    master?: string;
    sort?: string;
    dir?: string;
    page?: string;
    per?: string;
  }>;
};

/** The list page: heading, then one card with the toolbar and the table. */
export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  // Anything the URL can't mean is ignored, so a bad value shows the default view.
  const filters = parseFilters(params);
  const sort = parseSort(params.sort, params.dir);
  const paging = parsePaging(params.page, params.per);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Purchase orders</h1>
        <p className="text-muted">Check each vendor PO, then approve it for downstream systems.</p>
      </div>

      {/* Toolbar and table share one card. Only the table is keyed by the filters and sort,
          so it is the only part that shows a skeleton when one of them changes. */}
      {/* No overflow-hidden here: the Filters panel must be able to extend past the card. */}
      <section aria-label="Order list" className="rounded-xl border border-line bg-surface shadow-sm">
        <Suspense fallback={<ToolbarSkeleton />}>
          <OrdersToolbar filters={filters} />
        </Suspense>
        <Suspense
          key={`${filters.q}-${filters.status}-${filters.country}-${filters.vendor}-${filters.master}-${sort.key}-${sort.dir}-${paging.page}-${paging.per}`}
          fallback={<TableSkeleton />}
        >
          <OrdersTable filters={filters} sort={sort} paging={paging} />
        </Suspense>
      </section>
    </div>
  );
}
