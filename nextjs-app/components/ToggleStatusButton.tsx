"use client";

import { useActionState } from "react";
import { toggleReviewStatus, type ToggleState } from "@/app/actions";
import type { ReviewStatus } from "@/lib/types";

export function ToggleStatusButton({
  poNumber,
  status,
}: {
  poNumber: string;
  status: ReviewStatus;
}) {
  const [state, formAction, isPending] = useActionState<ToggleState, FormData>(
    toggleReviewStatus,
    {},
  );

  const approve = status === "pending";
  const label = approve ? "Approve" : "Move back to review";

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="poNumber" value={poNumber} />
      <button
        type="submit"
        disabled={isPending}
        className={`inline-flex min-h-11 items-center gap-2 rounded-md px-5 font-medium transition-colors disabled:cursor-wait ${
          approve
            ? "bg-accent text-white hover:bg-accent-dark disabled:bg-accent/80"
            : "border border-line-strong bg-white text-ink hover:bg-subtle"
        }`}
      >
        {isPending && (
          <span
            aria-hidden
            className="size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
          />
        )}
        {isPending ? "Saving…" : label}
      </button>
      {state.error && !isPending && (
        <p role="alert" className="max-w-xs text-right text-danger">
          {state.error.message} <span className="font-mono text-xs">({state.error.code})</span>
        </p>
      )}
    </form>
  );
}
