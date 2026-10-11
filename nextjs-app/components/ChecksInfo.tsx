/**
 * The ⓘ button beside a PO's status: opens a small panel listing every check the PO went
 * through, in plain words, with ✓ or ✗ (lib/checks.ts checkRules). Server Component built on
 * <details>, so it opens without JavaScript. Problems themselves are listed separately, in red,
 * only when there are any.
 */

import { checkSummary, type Problem } from "@/lib/checks";

/** Info button and the "how this PO was checked" panel. */
export function ChecksInfo({ problems }: { problems: Problem[] }) {
  const rules = checkSummary(problems);
  const failed = rules.filter((r) => r.failures > 0).length;
  return (
    <details className="group relative">
      <summary
        aria-label="How this PO was checked"
        title="How this PO was checked"
        className={`grid size-7 cursor-pointer list-none place-items-center rounded-full border text-sm font-semibold [&::-webkit-details-marker]:hidden ${
          failed ? "border-danger/40 text-danger" : "border-line-strong text-muted hover:text-ink"
        }`}
      >
        i
      </summary>
      <div className="absolute top-full left-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-4 shadow-lg">
        <p className="font-semibold">
          {failed ? `${failed} of ${rules.length} checks found a problem` : `All ${rules.length} checks passed`}
        </p>
        <p className="mb-3 text-xs text-muted">Run on every PO before it can be approved.</p>
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
    </details>
  );
}
