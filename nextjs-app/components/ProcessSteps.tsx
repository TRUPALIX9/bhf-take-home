type StepState = "done" | "current" | "problem" | "upcoming";
export type Step = { title: string; detail: string; state: StepState };

const dot: Record<StepState, string> = {
  done: "border-approved bg-approved text-white",
  current: "border-accent bg-white text-accent",
  problem: "border-danger bg-danger text-white",
  upcoming: "border-line-strong bg-white text-muted",
};
const icon: Record<StepState, string> = { done: "✓", current: "", problem: "!", upcoming: "" };

/**
 * Where a PO is in the flow, from left to right. The current step pulses.
 * Stacks vertically on phones.
 */
export function ProcessSteps({ steps }: { steps: Step[] }) {
  return (
    <ol
      aria-label="Order progress"
      className="grid gap-4 rounded-lg border border-line p-4 sm:grid-cols-4 sm:gap-0"
    >
      {steps.map((step, i) => (
        <li
          key={step.title}
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative flex gap-3 sm:flex-col sm:gap-2 sm:pr-4"
        >
          {/* connector to the next step (desktop only) */}
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={`absolute top-3 left-8 hidden h-0.5 w-[calc(100%-2.5rem)] sm:block ${
                step.state === "done" ? "bg-approved" : "bg-line"
              }`}
            />
          )}
          <span className="relative grid size-6 shrink-0 place-items-center">
            {step.state === "current" && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-accent/30 motion-safe:animate-ping"
              />
            )}
            <span
              className={`relative grid size-6 place-items-center rounded-full border-2 text-xs font-semibold ${dot[step.state]}`}
            >
              {icon[step.state] || (step.state === "current" && <span className="size-2 rounded-full bg-accent" />)}
            </span>
          </span>
          <span className="flex flex-col">
            <span className={`font-medium ${step.state === "upcoming" ? "text-muted" : ""}`}>
              {step.title}
            </span>
            <span className="text-xs text-muted">{step.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
