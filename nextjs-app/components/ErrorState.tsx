"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, linkClass } from "@/components/ui/Button";
import type { AppError } from "@/lib/errors";

/**
 * Shared body for the error boundaries. Logs the error, shows a plain message
 * with its code, and offers a retry plus a way back to the list.
 */
export function ErrorState({
  appError,
  error,
  reset,
}: {
  appError: AppError;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(`[${appError.code}]`, error);
  }, [appError.code, error]);

  return (
    <div role="alert" className="flex flex-col items-start gap-2 py-10">
      <p className="font-mono text-xs text-muted">Error {appError.code}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{appError.title}</h1>
      <p className="max-w-prose text-muted">{appError.message}</p>
      {error.digest && (
        // In production Next hides the real message; the digest matches the server log.
        <p className="font-mono text-xs text-muted">Reference {error.digest}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={linkClass}>
          Back to purchase orders
        </Link>
      </div>
    </div>
  );
}
