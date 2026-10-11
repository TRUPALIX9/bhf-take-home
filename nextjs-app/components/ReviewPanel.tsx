"use client";

/**
 * Header card on the PO page: PO number, status, the ⓘ check details, and the review actions.
 * Client Component: it opens the confirmation dialogs, shows the new status at once
 * (useOptimistic) and calls the server action (useActionState).
 *
 * The workflow, as it works with vendor POs:
 *   Pending review ── Approve ──────────────────────────► Approved (released downstream)
 *   Pending review ── Send back for correction (note) ──► Needs correction
 *   Needs correction ── Corrected PO received ──────────► Pending review
 *   Approved ── Revoke approval ────────────────────────► Pending review
 * Every step asks for confirmation first.
 */

import { startTransition, useActionState, useOptimistic, useState } from "react";
import { setReviewStatus, type ReviewActionState } from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { ReviewStatus } from "@/lib/types";

type Decision = "approve" | "correction" | "corrected" | "revoke";

// What each step sets, and how its button and dialog read.
const decisions: Record<Decision, { status: ReviewStatus; title: string; body?: string; confirm: string }> = {
  approve: {
    status: "approved",
    title: "Approve this PO?",
    body: "It will be released to downstream systems.",
    confirm: "Approve PO",
  },
  correction: {
    status: "needs_correction",
    title: "Send back for correction?",
    body: "The PO is held until a corrected one arrives. Say what needs fixing.",
    confirm: "Send back",
  },
  corrected: {
    status: "pending",
    title: "Corrected PO received?",
    body: "Use this when the vendor has sent the fix. The PO goes back to Pending review.",
    confirm: "Review again",
  },
  revoke: {
    status: "pending",
    title: "Revoke the approval?",
    body: "The PO goes back to Pending review and is held from downstream systems until it is approved again.",
    confirm: "Revoke approval",
  },
};

type Props = {
  poNumber: string;
  status: ReviewStatus;
  correctionNote?: string;
  subtitle: string; // "Harbor Point Trading Ltd · $447,455.12 · ships May 2, 2026"
  /** "How this PO was checked" panel (server-rendered), opened from the status pill. */
  info?: React.ReactNode;
  /** True when a check failed; the ⓘ in the status pill turns red. */
  hasProblems?: boolean;
  /** Problems found on the PO (server-rendered); nothing when there are none. */
  problems?: React.ReactNode;
  /** Starts the correction note when problems were found, so the vendor hears exactly what to fix. */
  suggestedNote?: string;
};

/** Title, status, actions, confirmation dialog, and the correction note when there is one. */
export function ReviewPanel({ poNumber, status, correctionNote, subtitle, info, hasProblems, problems, suggestedNote }: Props) {
  const [decision, setDecision] = useState<Decision | null>(null);

  // --- Optimistic state ---
  // `status` is the server value; `shown` is what the person sees. It changes the moment they
  // confirm, and React puts the server value back if the action returns an error.
  const [shown, showStatus] = useOptimistic<ReviewStatus, ReviewStatus>(status, (_current, next) => next);

  // --- Server action ---
  const [state, formAction, isPending] = useActionState<ReviewActionState, FormData>(async (prev, formData) => {
    showStatus(formData.get("status") as ReviewStatus);
    return setReviewStatus(prev, formData);
  }, {});

  /** Confirm button: close the dialog and run the action (in a transition, as React requires). */
  function confirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // the browser has already checked `required` on the note
    const formData = new FormData(e.currentTarget);
    setDecision(null);
    startTransition(() => formAction(formData));
  }

  const open = decision ? decisions[decision] : null;

  // --- Render ---
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{poNumber}</h1>
            {/* Status and check details in one control: the pill shows the status with an ⓘ,
                and clicking it opens what was checked. <details> needs no extra state. */}
            <details className="relative">
              <summary
                aria-label={`How this PO was checked (status: ${shown.replace("_", " ")})`}
                className="cursor-pointer list-none rounded-full [&::-webkit-details-marker]:hidden"
              >
                <StatusBadge
                  status={shown}
                  trailing={
                    <span
                      aria-hidden
                      className={`grid size-4 place-items-center rounded-full border text-[0.6rem] font-bold ${
                        hasProblems ? "border-danger text-danger" : "border-current opacity-70"
                      }`}
                    >
                      i
                    </span>
                  }
                />
              </summary>
              <div className="absolute top-full left-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-4 shadow-lg">
                {info}
              </div>
            </details>
          </div>
          <p className="text-muted">{subtitle}</p>
        </div>

        {/* The next steps for the current status. Each opens a confirmation dialog. */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            {shown === "pending" && (
              <>
                <Button variant="danger" pending={isPending} onClick={() => setDecision("correction")}>
                  Send back for correction
                </Button>
                <Button pending={isPending} onClick={() => setDecision("approve")}>
                  Approve
                </Button>
              </>
            )}
            {shown === "approved" && (
              <Button variant="secondary" pending={isPending} onClick={() => setDecision("revoke")}>
                Revoke approval
              </Button>
            )}
            {shown === "needs_correction" && (
              <Button pending={isPending} onClick={() => setDecision("corrected")}>
                Corrected PO received
              </Button>
            )}
          </div>
          {state.error && !isPending && (
            <p role="alert" className="max-w-xs text-right text-danger">
              {state.error.message} <span className="font-mono text-xs">({state.error.code})</span>
            </p>
          )}
        </div>
      </div>

      {/* What the vendor was asked to fix, while the PO waits for the correction. */}
      {shown === "needs_correction" && status === "needs_correction" && correctionNote && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3">
          <p className="font-medium text-danger">Sent back for correction</p>
          <p className="whitespace-pre-line">{correctionNote}</p>
        </div>
      )}

      {/* Problems found on the PO; nothing is shown when there are none. */}
      {problems}

      {/* Tells screen-reader users what happened after they confirm. */}
      <p role="status" className="sr-only">
        {isPending ? "Saving" : state.error ? "" : `Status: ${shown}`}
      </p>

      {/* One dialog, filled in for the chosen step. */}
      <Dialog open={open !== null} onClose={() => setDecision(null)} title={open?.title ?? ""}>
        {open && (
          <form onSubmit={confirm} className="flex flex-col gap-4">
            <input type="hidden" name="poNumber" value={poNumber} />
            <input type="hidden" name="status" value={open.status} />
            <p className="text-muted">
              <span className="font-mono font-medium text-ink">{poNumber}</span> · {subtitle}
            </p>
            {open.body && <p>{open.body}</p>}
            {decision === "correction" && (
              <label className="flex flex-col gap-1.5">
                <span className="font-medium">What needs fixing (required)</span>
                <textarea
                  name="reason"
                  required
                  maxLength={500}
                  rows={4}
                  autoFocus
                  defaultValue={suggestedNote}
                  placeholder="e.g. Ship date doesn't match the agreed schedule"
                  className="rounded-md border border-line-strong px-3 py-2"
                />
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDecision(null)}>
                Cancel
              </Button>
              <Button type="submit" variant={decision === "correction" ? "danger-solid" : "primary"}>
                {open.confirm}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
