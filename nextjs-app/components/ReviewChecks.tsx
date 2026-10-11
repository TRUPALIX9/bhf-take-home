/**
 * Problems found on the PO, shown on the PO page. Server Component. Renders nothing when
 * the PO is fine: a reviewer only needs to hear about problems. Each problem says what is
 * wrong, with the numbers, and what to do about it.
 */

import type { Problem } from "@/lib/checks";

/** Red alert listing each problem and its fix, or nothing. */
export function ReviewChecks({ problems }: { problems: Problem[] }) {
  if (problems.length === 0) return null;
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3">
      <p className="font-semibold text-danger">
        {problems.length === 1 ? "1 problem to fix before approving" : `${problems.length} problems to fix before approving`}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {problems.map((p, i) => (
          <li key={i} className="flex flex-col">
            <span className="font-medium">{p.title}</span>
            <span>{p.detail}</span>
            <span className="text-sm text-muted">What to do: {p.fix}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
