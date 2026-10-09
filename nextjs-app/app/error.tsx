"use client";

import { ErrorState } from "@/components/ErrorState";
import { appErrors } from "@/lib/errors";

/** Catches errors in any page. The header from layout.tsx stays on screen. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState appError={appErrors.pageFailed} error={error} reset={reset} />;
}
