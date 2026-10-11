/**
 * The three review checks as one chip in the PO header: "✓ All 3 checks pass". Click it to
 * see each check. Server Component built on <details>, so opening needs no JavaScript.
 * If any check fails the chip turns red and starts open, so a problem is never hidden.
 */

import type { Check } from "@/lib/checks";

/** Summary chip that expands to the list of checks. */
export function ReviewChecks({ checks }: { checks: Check[] }) {
  const failed = checks.filter((c) => !c.ok).length;
  const ok = failed === 0;
  return (
    <details open={!ok} className="group relative text-sm">
      <summary
        className={`inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-full px-3 font-medium [&::-webkit-details-marker]:hidden ${
          ok ? "bg-approved-bg text-approved" : "bg-danger/10 text-danger"
        }`}
      >
        <span aria-hidden>{ok ? "✓" : "✗"}</span>
        {ok ? `All ${checks.length} checks pass` : `${failed} of ${checks.length} checks failed`}
        <span aria-hidden className="text-xs transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <ul aria-label="Review checks" className="absolute right-0 z-20 mt-2 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-1.5 rounded-lg border border-line bg-surface p-3 shadow-lg">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2">
            <span aria-hidden className={c.ok ? "text-approved" : "text-danger"}>
              {c.ok ? "✓" : "✗"}
            </span>
            <span>
              {c.label}
              <span className="sr-only">{c.ok ? " (passes)" : " (fails)"}</span>
              <span className={`ml-2 text-xs ${c.ok ? "text-muted" : "text-danger"}`}>{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
