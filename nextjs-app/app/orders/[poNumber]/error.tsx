"use client";

/**
 * Error boundary for /orders/[poNumber]. Client Component (error boundaries need reset()).
 * Being closer than app/error.tsx, it handles detail-page failures with the PO-500 message.
 */
import { ErrorState } from "@/components/ErrorState";
import { appErrors } from "@/lib/errors";

/** Catches errors on a PO detail page, so a bad order doesn't take down the list. */
export default function OrderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState appError={appErrors.orderLoadFailed} error={error} reset={reset} />;
}
