/**
 * Sorting for the line items on a PO page (?lines=extCost&dir=desc). Pure functions.
 * With no sort, lines stay in the order printed on the PO. Clicking a header cycles:
 * sorted -> reversed -> back to printed order.
 */
import type { LineItem } from "@/lib/types";

// Only the columns that answer "which lines matter most": cost and quantity.
export const lineSortKeys = ["extCost", "extQty"] as const;
export type LineSortKey = (typeof lineSortKeys)[number];
export type LineSort = { key: LineSortKey; dir: "asc" | "desc" } | undefined;


/** Reads ?lines and ?dir. Anything unknown means printed order. */
export function parseLineSort(key?: string, dir?: string): LineSort {
  const k = lineSortKeys.find((x) => x === key);
  return k ? { key: k, dir: dir === "desc" ? "desc" : "asc" } : undefined;
}

/** Returns a sorted copy; ties keep the printed order. */
export function sortLines(lines: LineItem[], sort: LineSort): LineItem[] {
  if (!sort) return lines;
  const sign = sort.dir === "asc" ? 1 : -1;
  const value = (l: LineItem) => l[sort.key];
  return lines
    .map((line, i) => ({ line, i }))
    .sort((a, b) => {
      const x = value(a.line);
      const y = value(b.line);
      return sign * (x - y) || a.i - b.i;
    })
    .map(({ line }) => line);
}

/** Next sort for a header click: largest first, then smallest first, then back to printed order. */
export function nextLineSort(current: LineSort, key: LineSortKey): LineSort {
  if (current?.key !== key) return { key, dir: "desc" };
  if (current.dir === "desc") return { key, dir: "asc" };
  return undefined; // back to printed order
}

/** URL for the PO page with a line sort (none = printed order). */
export function lineSortHref(poNumber: string, sort: LineSort): string {
  return sort ? `/orders/${poNumber}?lines=${sort.key}&dir=${sort.dir}` : `/orders/${poNumber}`;
}
