/**
 * Sorting and searching the line items on a PO page (?lines=extCost&dir=desc&find=simone). Pure functions.
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

/** URL for the PO page with a line sort (none = printed order), keeping the line search and units. */
export function lineSortHref(poNumber: string, sort: LineSort, find?: string, units?: string): string {
  const params = new URLSearchParams();
  if (sort) {
    params.set("lines", sort.key);
    params.set("dir", sort.dir);
  }
  if (find) params.set("find", find);
  if (units && units !== "metric") params.set("units", units);
  const query = params.toString();
  return query ? `/orders/${poNumber}?${query}` : `/orders/${poNumber}`;
}

/** Lines matching a search on the PO page (?find=): SKU, UPC, vendor part or description. */
export function findLines(lines: LineItem[], find: string | undefined): LineItem[] {
  const needle = find?.trim().toLowerCase();
  if (!needle) return lines;
  return lines.filter((l) => [l.sku, l.upc, l.vendorPart, l.description].some((f) => f.toLowerCase().includes(needle)));
}
