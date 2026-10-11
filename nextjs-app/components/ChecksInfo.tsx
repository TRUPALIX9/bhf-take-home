/**
 * The "how this PO was checked" panel: every check the PO went through, in plain words, with
 * ✓ or ✗ (lib/checks.ts checkRules). Server Component, content only: ReviewPanel shows it when
 * the status pill on the PO page is clicked. Problems themselves are listed separately, in red,
 * only when there are any.
 */

import { checkSummary, type Problem } from "@/lib/checks";

/** Panel content: a heading, then one line per check. */
export function ChecksInfo({ problems }: { problems: Problem[] }) {
  const rules = checkSummary(problems);
  const failed = rules.filter((r) => r.failures > 0).length;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-semibold">
          {failed ? `${failed} of ${rules.length} checks found a problem` : `All ${rules.length} checks passed`}
        </p>
        <p className="text-xs text-muted">Run on every PO before it can be approved.</p>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {rules.map((r) => (
          <li key={r.title} className="flex gap-2">
            <span aria-hidden className={r.failures ? "text-danger" : "text-approved"}>
              {r.failures ? "✗" : "✓"}
            </span>
            <span>
              {r.explain}
              <span className="sr-only">{r.failures ? " Failed." : " Passed."}</span>
              {r.failures > 0 && (
                <span className="block text-xs text-danger">
                  {r.failures === 1 ? "1 problem" : `${r.failures} problems`}, see below
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
