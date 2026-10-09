"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
      <p className="text-muted">The page could not load. Try again; if it keeps failing, restart the server.</p>
      <button
        onClick={reset}
        className="min-h-11 rounded bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
      >
        Try again
      </button>
    </div>
  );
}
