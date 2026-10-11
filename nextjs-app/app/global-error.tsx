"use client";

/**
 * Top-level error boundary for failures in app/layout.tsx itself. Client Component.
 * Only used when app/error.tsx can't help, because that boundary lives inside the layout.
 */
// The root layout isn't rendered here, so the global styles have to be imported again.
import "./globals.css";
import { ErrorState } from "@/components/ErrorState";
import { appErrors } from "@/lib/errors";

/**
 * Last line of defence: catches errors in the root layout itself.
 * It replaces the whole page, so it renders its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      {/* The root layout (and its font loader) failed, so use a system font directly. */}
      <body className="text-sm antialiased" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <main className="mx-auto max-w-7xl px-4 sm:px-6">
          <ErrorState appError={appErrors.appFailed} error={error} reset={reset} />
        </main>
      </body>
    </html>
  );
}
