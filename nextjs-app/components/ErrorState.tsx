"use client";

/**
 * Body of the error boundaries (app/error.tsx, app/global-error.tsx,
 * app/orders/[poNumber]/error.tsx). Client Component: Next.js renders error boundaries
 * in the browser, and the copy button needs the clipboard.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorCard } from "@/components/ErrorCard";
import { Button, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { AppError } from "@/lib/errors";

/**
 * Logs the error, shows the shared error card with Try again and Back, and the
 * reference number with a copy button so it can be pasted into a support message.
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
  const [copied, setCopied] = useState(false);

  // Log once per error so the real message is in the browser console for developers.
  useEffect(() => {
    console.error(`[${appError.code}]`, error);
  }, [appError.code, error]);

  // Copies "APP-500 / 2048564588"; the digest matches the entry in the server log.
  async function copyReference() {
    try {
      await navigator.clipboard.writeText(`${appError.code} / ${error.digest}`);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the reference is still on screen to copy by hand.
    }
  }

  return (
    <ErrorCard appError={appError} icon="alert" tone="danger">
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonClass("secondary")}>
          Back to purchase orders
        </Link>
      </div>
      {/* In production Next hides the real message; this reference finds it in the server log. */}
      {error.digest && (
        <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-subtle px-4 py-2.5 text-left">
          <span className="flex flex-col">
            <span className="text-xs text-muted">Reference for support</span>
            <span className="font-mono text-sm">{error.digest}</span>
          </span>
          <button
            type="button"
            onClick={copyReference}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-accent hover:bg-accent-soft"
          >
            <Icon name="copy" className="size-4" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </ErrorCard>
  );
}
