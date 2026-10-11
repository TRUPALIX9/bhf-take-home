"use client";

/**
 * Route error boundary for the whole app. Client Component, because Next.js error
 * boundaries run in the browser and need the reset() callback to retry.
 * Shows ErrorState with the APP-500 code from lib/errors.ts.
 */
import { ErrorState } from "@/components/ErrorState";
import { appErrors } from "@/lib/errors";

/** Catches errors in any page. The header from layout.tsx stays on screen. */
export default function AppError({
  error,
  reset,
}: {
  // digest is a hash Next.js adds for server errors; it matches the entry in the server log.
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState appError={appErrors.pageFailed} error={error} reset={reset} />;
}
