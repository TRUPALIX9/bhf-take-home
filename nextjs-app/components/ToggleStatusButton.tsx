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
    { status },
  );

  const approve = status === "pending";
  const label = approve ? "Approve" : "Move back to review";

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="poNumber" value={poNumber} />
      <button
        type="submit"
        disabled={isPending}
        className={`min-h-11 rounded px-5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
          approve
            ? "bg-accent text-white hover:bg-accent-dark"
            : "border border-line-strong bg-white text-ink hover:bg-subtle"
        }`}
      >
        {isPending ? "Saving…" : label}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
