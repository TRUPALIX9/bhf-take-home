/**
 * What can be wrong with a PO, in plain words, with what to do about it. Pure functions.
 * The first three are the same rules the Python parser checks on the raw PO (po_extract.py);
 * the rest catch other mistakes a reviewer would want to know about before approving.
 *
 * Only problems are returned: a PO with nothing wrong returns an empty list.
 */
import { formatCount, formatDate, formatMoney, formatUnitCost } from "@/lib/format";
import type { LineItem, Order } from "@/lib/types";

export type Problem = { title: string; detail: string; fix: string };

/** Every rule a PO is checked against, in plain words, for the "how this PO was checked" panel. */
export const checkRules: { title: string; explain: string }[] = [
  { title: "Unit count is wrong", explain: "Each line's units equal its cartons times the number per carton." },
  { title: "Line cost is wrong", explain: "Each line's cost equals its units times the unit cost." },
  { title: "A line orders nothing", explain: "Every line orders at least one unit." },
  { title: "Cost is at or above retail", explain: "Every item costs less than it sells for." },
  { title: "Lines don't add up to the PO total", explain: "The line costs add up to the total printed on the PO." },
  { title: "Same item on more than one line", explain: "Each item appears on only one line." },
  { title: "Ships before it was ordered", explain: "The ship date is on or after the PO date." },
];

/** Each rule with how many times it failed on this order (0 = passed). */
export function checkSummary(problems: Problem[]) {
  return checkRules.map((rule) => ({ ...rule, failures: problems.filter((p) => p.title === rule.title).length }));
}

// Money is stored as floating point, so compare to a tenth of a cent instead of exactly.
const same = (a: number, b: number) => Math.abs(a - b) < 0.0005;
const item = (l: LineItem) => `SKU ${l.sku} (${l.description})`;

/** Every problem found on the order, most serious first. Empty when the PO is fine. */
export function findProblems(order: Order): Problem[] {
  const problems: Problem[] = [];
  const askVendor = "Ask the vendor to send a corrected PO.";

  for (const l of order.lines) {
    // 1. Units must equal cartons times the number per carton.
    if (l.cartons * l.casePack !== l.extQty) {
      problems.push({
        title: "Unit count is wrong",
        detail: `${item(l)}: ${formatCount(l.cartons)} cartons of ${l.casePack} should be ${formatCount(l.cartons * l.casePack)} units, but the PO says ${formatCount(l.extQty)}.`,
        fix: askVendor,
      });
    }
    // 2. The line cost must equal units times the unit cost.
    if (!same(l.cost * l.extQty, l.extCost)) {
      problems.push({
        title: "Line cost is wrong",
        detail: `${item(l)}: ${formatCount(l.extQty)} units at ${formatUnitCost(l.cost)} should cost ${formatMoney(l.cost * l.extQty)}, but the PO says ${formatMoney(l.extCost)}.`,
        fix: askVendor,
      });
    }
    // 3. A line with nothing on it.
    if (l.extQty <= 0) {
      problems.push({
        title: "A line orders nothing",
        detail: `${item(l)} orders ${formatCount(l.extQty)} units.`,
        fix: "Ask the vendor whether the line should be removed.",
      });
    }
    // 4. Buying at or above the shelf price means selling at a loss.
    if (l.cost >= l.retail) {
      problems.push({
        title: "Cost is at or above retail",
        detail: `${item(l)} costs ${formatUnitCost(l.cost)} but sells for ${formatMoney(l.retail)}, so it would sell at a loss.`,
        fix: "Check the price with the buyer before approving.",
      });
    }
  }

  // 5. The lines must add up to the total printed on the PO.
  const sum = Math.round(order.lines.reduce((t, l) => t + l.extCost, 0) * 100) / 100;
  if (!same(sum, order.totalCost)) {
    problems.push({
      title: "Lines don't add up to the PO total",
      detail: `The lines add up to ${formatMoney(sum)}, but the PO total is ${formatMoney(order.totalCost)} (off by ${formatMoney(Math.abs(sum - order.totalCost))}).`,
      fix: "Look for a missing or extra line, then ask the vendor to send a corrected PO.",
    });
  }

  // 6. The same item ordered on two lines.
  const seen = new Map<string, number>();
  for (const l of order.lines) seen.set(l.sku, (seen.get(l.sku) ?? 0) + 1);
  for (const [sku, count] of seen) {
    if (count > 1) {
      problems.push({
        title: "Same item on more than one line",
        detail: `SKU ${sku} appears on ${count} lines.`,
        fix: "Ask the vendor whether these should be one line.",
      });
    }
  }

  // 7. A PO can't ship before it was placed.
  if (order.shipDate < order.poDate) {
    problems.push({
      title: "Ships before it was ordered",
      detail: `The ship date (${formatDate(order.shipDate)}) is before the PO date (${formatDate(order.poDate)}).`,
      fix: "Ask the vendor for the correct ship date.",
    });
  }

  return problems;
}

/** The problems as text for the correction note, so the vendor gets the details. */
export function problemsAsReason(problems: Problem[]): string {
  return problems.map((p) => `${p.title}: ${p.detail}`).join("\n").slice(0, 500);
}
