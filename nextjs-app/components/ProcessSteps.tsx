/**
 * Four-step progress tracker on the PO detail page, rendered inside ReviewPanel.
 * No hooks or handlers, so it works as a Server Component, but it runs on the client
 * here because ReviewPanel imports it. That lets it follow the optimistic status.
 */

// --- Types and style maps ---
type StepState = "done" | "current" | "problem" | "upcoming";
export type Step = { title: string; detail: string; state: StepState };

// Record<StepState, ...> makes TypeScript fail if a state is added without a style.
const dot: Record<StepState, string> = {
  done: "border-approved bg-approved text-inverse",
  current: "border-accent bg-surface text-accent",
  problem: "border-danger bg-danger text-inverse",
  upcoming: "border-line-strong bg-surface text-muted",
};

// What a screen reader hears after each step title.
const spoken: Record<StepState, string> = {
  done: "done",
  current: "in progress",
  problem: "needs attention",
  upcoming: "not started",
};

/**
 * Where a PO is in the flow, left to right (stacked on phones).
 * When a step changes state, its dot fades to the new color, a check mark pops in,
 * and the connector to the next step fills from left to right. The current step pulses.
 * All motion is skipped when the person has asked for reduced motion.
 */
export function ProcessSteps({ steps }: { steps: Step[] }) {
  // --- Render ---
  // An <ol> because the order of the steps carries meaning for screen readers.
  return (
    <ol
      aria-label="Order progress"
      className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-4 sm:gap-0"
    >
      {steps.map((step, i) => (
        <li
          key={step.title}
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative flex gap-3 sm:flex-col sm:gap-2 sm:pr-4"
        >
          {/* Connector line to the next step (not after the last one). The inner bar scales
              from 0 to 100% width when the step is done; transform animates smoothly. */}
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className="absolute top-3 left-8 hidden h-0.5 w-[calc(100%-2.5rem)] overflow-hidden rounded bg-line sm:block"
            >
              <span
                className={`block h-full origin-left bg-approved motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out ${
                  step.state === "done" ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </span>
          )}

          <span className="relative grid size-6 shrink-0 place-items-center">
            {/* Pulsing ring behind the current step's dot */}
            {step.state === "current" && (
              <span aria-hidden className="absolute inset-0 rounded-full bg-accent/30 motion-safe:animate-ping" />
            )}
            <span
              aria-hidden
              className={`relative grid size-6 place-items-center rounded-full border-2 text-xs font-semibold transition-colors duration-300 ${dot[step.state]}`}
            >
              {/* key makes the mark re-mount, so the pop plays each time the state changes */}
              {step.state === "done" && (
                <span key="done" className="motion-safe:animate-pop">
                  ✓
                </span>
              )}
              {step.state === "problem" && <span key="problem">!</span>}
              {step.state === "current" && <span className="size-2 rounded-full bg-accent" />}
            </span>
          </span>

          {/* Title and detail. The dot is aria-hidden, so the sr-only text gives its meaning. */}
          <span className="flex flex-col">
            <span className={`font-medium transition-colors ${step.state === "upcoming" ? "text-muted" : ""}`}>
              {step.title}
              <span className="sr-only"> ({spoken[step.state]})</span>
            </span>
            <span className="text-xs text-muted">{step.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
