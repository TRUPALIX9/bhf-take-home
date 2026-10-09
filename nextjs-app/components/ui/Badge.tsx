export type Tone = "pending" | "approved" | "danger" | "neutral";

const tones: Record<Tone, string> = {
  pending: "bg-pending-bg text-pending",
  approved: "bg-approved-bg text-approved",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-subtle text-muted",
};

/** Small rounded label with a colored dot. Color changes fade instead of jumping. */
export function Badge({
  tone,
  children,
  testId,
}: {
  tone: Tone;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-300 ${tones[tone]}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
