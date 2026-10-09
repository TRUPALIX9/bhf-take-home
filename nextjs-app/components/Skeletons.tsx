/** Grey placeholder shapes shown while data streams in. They pulse unless reduced motion is on. */

const bar = "rounded bg-line motion-safe:animate-pulse";

function Loading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function StatRow() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-line p-4">
          <span className={`${bar} h-3.5 w-24`} />
          <span className={`${bar} h-7 w-32`} />
          <span className={`${bar} h-3 w-20`} />
        </div>
      ))}
    </div>
  );
}

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

export function SummarySkeleton() {
  return (
    <Loading label="Loading order summary">
      <StatRow />
      <div className="flex gap-4 border-b border-line pb-3">
        <span className={`${bar} h-5 w-16`} />
        <span className={`${bar} h-5 w-32`} />
        <span className={`${bar} h-5 w-24`} />
      </div>
    </Loading>
  );
}

export function TableSkeleton() {
  return (
    <Loading label="Loading purchase orders">
      <Rows count={4} columns={6} />
    </Loading>
  );
}

export function OrderDetailSkeleton() {
  return (
    <Loading label="Loading purchase order">
      <div className="flex flex-col gap-2">
        <span className={`${bar} h-8 w-48`} />
        <span className={`${bar} h-4 w-80 max-w-full`} />
      </div>
      <span className={`${bar} h-16 w-full`} />
      <StatRow />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-lg border border-line">
          <Rows count={8} columns={5} />
        </div>
        <div className="flex flex-col gap-4">
          <span className={`${bar} h-40`} />
          <span className={`${bar} h-28`} />
        </div>
      </div>
    </Loading>
  );
}
