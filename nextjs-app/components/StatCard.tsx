/** One headline number with a label, used in the stat rows on both pages. */
export function StatCard({
  label,
  value,
  note,
  testId,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-white p-4">
      <span className="text-muted">{label}</span>
      <span className="num text-2xl font-semibold tracking-tight" data-testid={testId}>
        {value}
      </span>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  );
}
