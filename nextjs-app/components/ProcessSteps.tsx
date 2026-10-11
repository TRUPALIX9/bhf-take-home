/**
 * Compact step tracker on the PO page: one line, "✓ Received › ✓ Parsed › ● Review › ○ Ready".
 * No hooks; it runs on the client because ReviewPanel imports it, so it follows the
 * optimistic status and moves the moment Approve is clicked. Each step's detail
 * ("PO dated Mar 14, 2026") is in a tooltip and read out to screen readers.
 */

type StepState = "done" | "current" | "problem" | "upcoming";
export type Step = { title: string; detail: string; state: StepState };

// Small circle for each state. Record<StepState, ...> makes TypeScript catch a missing state.
const dot: Record<StepState, string> = {
  done: "bg-approved text-inverse",
  current: "bg-accent-soft text-accent ring-2 ring-accent",
  problem: "bg-danger text-inverse",
  upcoming: "bg-surface text-muted ring-1 ring-line-strong",
};
const mark: Record<StepState, string> = { done: "✓", current: "", problem: "!", upcoming: "" };
// What a screen reader hears after each step title.
const spoken: Record<StepState, string> = {
  done: "done",
  current: "in progress",
  problem: "needs attention",
  upcoming: "not started",
};

/** Where the PO is in the flow, in one line that wraps on phones. */
export function ProcessSteps({ steps }: { steps: Step[] }) {
  return (
    <ol aria-label="Order progress" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {steps.map((step, i) => (
        <li
          key={step.title}
          title={step.detail}
          aria-current={step.state === "current" ? "step" : undefined}
          className="flex items-center gap-2"
        >
          <span
            aria-hidden
            className={`grid size-5 place-items-center rounded-full text-[0.65rem] font-semibold transition-colors duration-300 ${dot[step.state]}`}
          >
            {/* key re-mounts the mark so the pop plays each time a step completes */}
            <span key={step.state} className={step.state === "done" ? "motion-safe:animate-pop" : ""}>
              {mark[step.state] || (step.state === "current" ? <span className="block size-1.5 rounded-full bg-accent" /> : null)}
            </span>
          </span>
          <span className={step.state === "upcoming" ? "text-muted" : "font-medium"}>
            {step.title}
            <span className="sr-only">
              {" "}
              ({spoken[step.state]}): {step.detail}
            </span>
          </span>
          {i < steps.length - 1 && (
            <span aria-hidden className="text-line-strong">
              ›
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
