/**
 * Horizontal bars for showing a share of a whole. Server-safe (no hooks).
 * Meter: one value, e.g. this line's share of the PO total.
 * SegmentedBar: parts of one whole side by side, e.g. approved vs pending value.
 * Widths are inline styles because they come from data; colors come from the theme tokens.
 */

type Tone = "accent" | "approved" | "pending";

const fills: Record<Tone, string> = {
  accent: "bg-accent",
  approved: "bg-approved",
  pending: "bg-pending",
};

/** A thin bar filled to `share` (0 to 1). `label` is what a screen reader hears. */
export function Meter({ share, label, tone = "accent" }: { share: number; label: string; tone?: Tone }) {
  // Never fully empty for a non-zero share, so a small line is still visible.
  const width = share > 0 ? Math.max(share * 100, 2) : 0;
  return (
    <span role="img" aria-label={label} className="block h-1.5 w-full overflow-hidden rounded-full bg-line">
      <span className={`block h-full rounded-full ${fills[tone]}`} style={{ width: `${width}%` }} />
    </span>
  );
}

/** Several parts of one whole in a single bar, with a 2px gap between them. */
export function SegmentedBar({
  segments,
  label,
}: {
  segments: { share: number; tone: Tone }[];
  label: string;
}) {
  return (
    <span role="img" aria-label={label} className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-line">
      {segments
        .filter((s) => s.share > 0)
        .map((s, i) => (
          <span key={i} className={`h-full ${fills[s.tone]}`} style={{ width: `${s.share * 100}%` }} />
        ))}
    </span>
  );
}
