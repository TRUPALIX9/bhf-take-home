/**
 * The review checks shown at the top of a PO page. Pure functions, safe anywhere.
 * They are the same checks the Python parser runs on the raw PO (po_extract.py):
 * cartons x case pack = units, unit cost x units = ext cost, and lines add up to the total.
 */
import type { LineItem, Order } from "@/lib/types";

export type Check = { label: string; ok: boolean; detail: string };

// Money is stored as floating point, so compare to a tenth of a cent instead of exactly.
const same = (a: number, b: number) => Math.abs(a - b) < 0.0005;

/** SKUs of the lines where the check fails. */
const failing = (lines: LineItem[], ok: (l: LineItem) => boolean) => lines.filter((l) => !ok(l)).map((l) => l.sku);

/** Runs the three checks on one order. */
export function reviewChecks(order: Order): Check[] {
  const qty = failing(order.lines, (l) => l.cartons * l.casePack === l.extQty);
  const cost = failing(order.lines, (l) => same(l.cost * l.extQty, l.extCost));
  const sum = order.lines.reduce((t, l) => t + l.extCost, 0);
  const totalOk = same(Math.round(sum * 100) / 100, order.totalCost);
  const lines = `${order.lines.length} lines`;

  return [
    {
      label: "Cartons × pack = units",
      ok: qty.length === 0,
      detail: qty.length === 0 ? `All ${lines}` : `Off on SKU ${qty.join(", ")}`,
    },
    {
      label: "Unit cost × units = ext cost",
      ok: cost.length === 0,
      detail: cost.length === 0 ? `All ${lines}` : `Off on SKU ${cost.join(", ")}`,
    },
    {
      label: "Lines add up to the PO total",
      ok: totalOk,
      detail: totalOk ? "Matches the printed total" : `Lines sum to ${sum.toFixed(2)}`,
    },
  ];
}
