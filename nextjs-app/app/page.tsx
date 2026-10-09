import { Suspense } from "react";
import { OrdersSummary } from "@/components/OrdersSummary";
import { OrdersTable } from "@/components/OrdersTable";
import { SummarySkeleton, TableSkeleton } from "@/components/Skeletons";
import type { ReviewStatus } from "@/lib/types";

// Review status changes at runtime, so render on every request.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const filter: ReviewStatus | undefined =
    status === "pending" || status === "approved" ? status : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Purchase orders</h1>
        <p className="text-muted">Check each vendor PO, then approve it for downstream systems.</p>
      </div>

      {/* Two boundaries so each part only reloads when its own data changes:
          the summary has no key, so it stays put when the tab changes;
          the table is keyed by filter, so only it shows a skeleton. */}
      <div className="flex flex-col">
        <Suspense fallback={<SummarySkeleton />}>
          <OrdersSummary />
        </Suspense>
        <Suspense key={filter ?? "all"} fallback={<TableSkeleton />}>
          <OrdersTable filter={filter} />
        </Suspense>
      </div>
    </div>
  );
}
