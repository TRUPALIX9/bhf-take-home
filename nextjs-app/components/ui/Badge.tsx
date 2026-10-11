/**
 * Shared pill used for status badges and tab counts. Server-safe: no hooks.
 * Color comes from the @theme tokens in globals.css via the tone map below.
 */

export type Tone = "pending" | "approved" | "needs_correction" | "accent" | "neutral";

const tones: Record<Tone, string> = {
  pending: "bg-pending-bg text-pending",
  approved: "bg-approved-bg text-approved",
  needs_correction: "bg-danger/10 text-danger",
  accent: "bg-accent-soft text-accent",
  neutral: "bg-subtle text-muted",
};

/** Small rounded label. Status badges have a colored dot; count pills don't. Color changes fade. */
export function Badge({
  tone,
  children,
  dot = true,
  testId,
}: {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={`num inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-300 ${tones[tone]}`}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
