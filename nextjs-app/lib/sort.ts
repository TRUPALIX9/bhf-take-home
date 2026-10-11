/**
 * Sorting for the PO list. Pure functions, safe on server and client.
 * The sort lives in the URL (?sort=total&dir=desc), so a sorted view can be shared
 * and the server renders it sorted; the browser needs no extra JavaScript.
 */
import { vendorName } from "@/lib/format";
import type { Order } from "@/lib/types";

export const sortKeys = ["po", "status", "vendor", "ship", "lines", "total"] as const;
export type SortKey = (typeof sortKeys)[number];
export type SortDir = "asc" | "desc";
export type Sort = { key: SortKey; dir: SortDir };

/** Default view: earliest ship date first, the order a buyer works in. */
export const defaultSort: Sort = { key: "ship", dir: "asc" };

/** Reads ?sort and ?dir from the URL. Unknown or missing values fall back to the default. */
export function parseSort(sort?: string, dir?: string): Sort {
  const key = sortKeys.find((k) => k === sort);
  if (!key) return defaultSort;
  return { key, dir: dir === "desc" ? "desc" : "asc" };
}

// How to compare two orders for each column.
const compare: Record<SortKey, (a: Order, b: Order) => number> = {
  po: (a, b) => a.poNumber.localeCompare(b.poNumber),
  status: (a, b) => a.status.localeCompare(b.status),
  vendor: (a, b) => vendorName(a).localeCompare(vendorName(b)),
  ship: (a, b) => a.shipDate.localeCompare(b.shipDate), // ISO dates sort as strings
  lines: (a, b) => a.lines.length - b.lines.length,
  total: (a, b) => a.totalCost - b.totalCost,
};

/** Returns a sorted copy. Ties keep PO number order, so the result is always the same. */
export function sortOrders(orders: Order[], { key, dir }: Sort): Order[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...orders].sort((a, b) => sign * compare[key](a, b) || a.poNumber.localeCompare(b.poNumber));
}

/** The sort a header link should apply: same column flips direction, a new column starts ascending
 *  (numbers and dates start descending, biggest or latest first, which is what people usually want). */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: key === "total" || key === "lines" ? "desc" : "asc" };
}

/** The list filters that live in the URL next to the sort (see lib/filters.ts). */
export type Filters = { status?: string; country?: string[]; vendor?: string[]; master?: string };

/** Builds the list URL for the filters and a sort, leaving out empty values and defaults. */
export function listHref({ status, country = [], vendor = [], master }: Filters, sort: Sort): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (country.length) params.set("country", country.join(","));
  if (vendor.length) params.set("vendor", vendor.join(","));
  if (master) params.set("master", master);
  if (sort.key !== defaultSort.key || sort.dir !== defaultSort.dir) {
    params.set("sort", sort.key);
    params.set("dir", sort.dir);
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
