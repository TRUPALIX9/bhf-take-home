/**
 * Row of pass/fail checks above the PO document. Server Component.
 * Green with a check mark when a check passes, red with a cross when it fails,
 * so a reviewer can see at a glance whether the PO is safe to approve.
 */

import type { Check } from "@/lib/checks";

/** One card per check: icon, what was checked, and the result in words. */
export function ReviewChecks({ checks }: { checks: Check[] }) {
  return (
    <ul aria-label="Review checks" className="grid gap-3 sm:grid-cols-3">
      {checks.map((c) => (
        <li
          key={c.label}
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            c.ok ? "border-approved/30 bg-approved-bg" : "border-danger/40 bg-danger/5"
          }`}
        >
          <span
            aria-hidden
            className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold text-inverse ${
              c.ok ? "bg-approved" : "bg-danger"
            }`}
          >
            {c.ok ? "✓" : "✗"}
          </span>
          <span className="flex flex-col">
            <span className="font-medium">
              {c.label}
              <span className="sr-only">{c.ok ? " (passes)" : " (fails)"}</span>
            </span>
            <span className={`text-xs ${c.ok ? "text-approved" : "text-danger"}`}>{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
