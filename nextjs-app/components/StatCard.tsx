/**
 * One headline number with a label, used in the stat rows on both pages.
 * Server Component. `testId` lets the Playwright tests find a specific number.
 */

import { Card } from "@/components/ui/Card";

const toneText = { pending: "text-pending", approved: "text-approved", danger: "text-danger" } as const;

/** A labelled number with an optional note under it. */
export function StatCard({
  label,
  value,
  note,
  testId,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  testId?: string;
  /** Colors the number when it carries a signal: pending work, all clear, or a problem. */
  tone?: "pending" | "approved" | "danger";
}) {
  return (
    <Card className="gap-1">
      <span className="text-muted">{label}</span>
      {/* num = tabular figures; nowrap keeps money values on one line */}
      <span className={`num text-xl font-semibold tracking-tight whitespace-nowrap sm:text-2xl ${tone ? toneText[tone] : ""}`}
        data-testid={testId}>
        {value}
      </span>
      {note && <span className="text-xs text-muted">{note}</span>}
    </Card>
  );
}
