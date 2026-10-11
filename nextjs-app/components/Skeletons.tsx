/**
 * Suspense fallbacks for the list page (ToolbarSkeleton, TableSkeleton) and the PO page
 * (OrderDetailSkeleton). Server Components: plain markup, no state.
 * Each one has the same layout as the content it stands in for, so nothing jumps when data arrives.
 * The bars pulse unless reduced motion is on.
 */

import { Card } from "@/components/ui/Card";

// --- Building blocks ---
const bar = "rounded bg-line motion-safe:animate-pulse";

/** Wrapper that tells screen readers something is loading (role="status" is a polite live region). */
function Loading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}


/** Placeholder table rows. Each bar's pulse starts a little later, so the pulse ripples across. */
function Rows({ count, columns }: { count: number; columns: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }, (_, r) => (
        <div key={r} className="flex items-center gap-6 border-b border-line px-3 py-4">
          {Array.from({ length: columns }, (_, c) => (
            <span
              key={c}
              className={`${bar} h-3.5 flex-1`}
              style={{ animationDelay: `${(r * columns + c) * 40}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// --- Exported skeletons ---

/** Tabs on the left and origin chips on the right, while the counts load. */
export function ToolbarSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-4">
      <span className="flex gap-4">
        <span className={`${bar} h-5 w-16`} />
        <span className={`${bar} h-5 w-32`} />
        <span className={`${bar} h-5 w-24`} />
      </span>
      <span className={`${bar} hidden h-7 w-56 md:block`} />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <Loading label="Loading purchase orders">
      <Rows count={4} columns={6} />
    </Loading>
  );
}

/** Fallback for OrderDetail on the PO page. */
export function OrderDetailSkeleton() {
  return (
    <Loading label="Loading purchase order">
      {/* title, badge and button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className={`${bar} h-8 w-48`} />
          <span className={`${bar} h-4 w-80 max-w-full`} />
        </div>
        <span className={`${bar} h-11 w-28`} />
      </div>
      {/* step tracker */}
      <Card className="grid gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <span className={`${bar} size-6 rounded-full`} />
            <span className={`${bar} h-3.5 w-28`} />
          </div>
        ))}
      </Card>
      {/* three review checks */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`${bar} h-16`} />
        ))}
      </div>
      {/* the PO document: header, three address blocks, terms strip, line items */}
      <div className="flex flex-col rounded-lg border border-line-strong">
        <div className="flex justify-between border-b border-line p-5">
          <span className={`${bar} h-6 w-56`} />
          <span className={`${bar} h-8 w-32`} />
        </div>
        <div className="grid gap-4 border-b border-line p-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <span className={`${bar} h-3 w-16`} />
              <span className={`${bar} h-3.5 w-full`} />
              <span className={`${bar} h-3.5 w-3/4`} />
            </div>
          ))}
        </div>
        <Rows count={8} columns={8} />
      </div>
    </Loading>
  );
}
