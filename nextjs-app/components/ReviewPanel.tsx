"use client";

/**
 * Title bar, approve/move-back button and step tracker on the PO detail page (used by OrderDetail).
 * Client Component: it needs useActionState and useOptimistic to show the new status
 * before the server action finishes.
 */

import { useActionState, useOptimistic } from "react";
import { toggleReviewStatus, type ToggleState } from "@/app/actions";
import { ProcessSteps, type Step } from "@/components/ProcessSteps";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import type { ReviewStatus } from "@/lib/types";

// --- Props and step data ---
type Props = {
  poNumber: string;
  status: ReviewStatus;
  subtitle: string;
  poDate: string; // already formatted
  lineCount: number;
  totalsMatch: boolean;
};

/** Builds the four tracker steps from the status that is on screen right now. */
function stepsFor(status: ReviewStatus, p: Props): Step[] {
  const approved = status === "approved";
  return [
    { title: "Received", detail: `PO dated ${p.poDate}`, state: "done" },
    {
      title: "Parsed and checked",
      detail: p.totalsMatch ? `${p.lineCount} lines, totals match` : "Line totals do not match the PO",
      state: p.totalsMatch ? "done" : "problem",
    },
    {
      title: "Review",
      detail: approved ? "Approved" : "Waiting for approval",
      state: approved ? "done" : "current",
    },
    {
      title: "Ready for downstream",
      detail: approved ? "Can be sent on" : "After approval",
      state: approved ? "done" : "upcoming",
    },
  ];
}

/**
 * PO title, status badge, review button and the step tracker.
 * Clicking the button updates all of them at once (optimistic update) while the
 * server action runs. If the action fails, React puts the old status back and the
 * error appears under the button.
 */
export function ReviewPanel(props: Props) {
  const { poNumber, status, subtitle } = props;

  // --- Optimistic state ---
  // `status` is the server value. `shownStatus` is what the user sees: it equals `status`
  // except while an action is running. When the action ends and the page revalidates,
  // React drops the optimistic value and shows the server one again.
  // The reducer flips whatever is on screen now, so it never works from a stale value.
  const [shownStatus, flipShownStatus] = useOptimistic<ReviewStatus, void>(status, (current) =>
    current === "pending" ? "approved" : "pending",
  );

  // --- Server action ---
  // useActionState gives the last result (state.error), a form action to pass to <form>,
  // and isPending while it runs. The optimistic flip must happen inside the action so
  // React ties it to this transition.
  const [state, formAction, isPending] = useActionState<ToggleState, FormData>(
    async (prev, formData) => {
      flipShownStatus();
      return toggleReviewStatus(prev, formData);
    },
    {},
  );

  // True when the button should approve; false when it should move the PO back.
  const approve = shownStatus === "pending";

  // --- Render ---
  return (
    <div className="flex flex-col gap-6">
      {/* Title bar: PO number, badge and subtitle on the left, button on the right */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{poNumber}</h1>
            <StatusBadge status={shownStatus} />
          </div>
          <p className="text-muted">{subtitle}</p>
        </div>

        {/* A real <form> posting to a server action, so the button is a plain submit. */}
        <form action={formAction} className="flex flex-col items-end gap-2">
          <input type="hidden" name="poNumber" value={poNumber} />
          {/* While saving, the label names the step we are moving to. */}
          <Button type="submit" variant={approve ? "primary" : "secondary"} pending={isPending}>
            {isPending
              ? approve
                ? "Moving back…"
                : "Approving…"
              : approve
                ? "Approve"
                : "Move back to review"}
          </Button>
          {state.error && !isPending && (
            <p role="alert" className="max-w-xs text-right text-danger">
              {state.error.message} <span className="font-mono text-xs">({state.error.code})</span>
            </p>
          )}
        </form>
      </div>

      {/* Tells screen-reader users what happened after they press the button. */}
      <p role="status" className="sr-only">
        {isPending ? "Saving" : state.error ? "" : `Status: ${shownStatus === "approved" ? "Approved" : "Pending review"}`}
      </p>

      {/* Step tracker follows shownStatus, so it moves on click like the badge. */}
      <ProcessSteps steps={stepsFor(shownStatus, props)} />
    </div>
  );
}
