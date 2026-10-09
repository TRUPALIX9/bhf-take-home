export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-64 rounded bg-subtle" />
      <div className="h-4 w-96 max-w-full rounded bg-subtle" />
      <div className="h-64 rounded border border-line bg-subtle" />
    </div>
  );
}
