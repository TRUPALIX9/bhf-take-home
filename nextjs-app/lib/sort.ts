/**
 * Sorting for the PO list. Pure functions, safe on server and client.
 * The sort lives in the URL (?sort=total&dir=desc), so a sorted view can be shared
 * and the server renders it sorted; the browser needs no extra JavaScript.
 */
import type { Order } from "@/lib/types";

// Only the columns where the order helps a decision: what ships first, where the money is.
// Status, vendor and origin are filters instead; PO number and line count don't need sorting.
export const sortKeys = ["ship", "total"] as const;
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
  ship: (a, b) => a.shipDate.localeCompare(b.shipDate), // ISO dates sort as strings
  total: (a, b) => a.totalCost - b.totalCost,
};

/** Returns a sorted copy. Ties keep PO number order, so the result is always the same. */
export function sortOrders(orders: Order[], { key, dir }: Sort): Order[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...orders].sort((a, b) => sign * compare[key](a, b) || a.poNumber.localeCompare(b.poNumber));
}

/** The sort a header link should apply: the same column flips direction; total starts with the
 *  biggest first, ship date with the earliest first. */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: key === "total" ? "desc" : "asc" };
}

/** The list filters that live in the URL next to the sort (see lib/filters.ts). */
export type Filters = { status?: string; country?: string[]; vendor?: string[]; master?: string[] };

/** Builds the list URL for the filters and a sort, leaving out empty values and defaults. */
export function listHref({ status, country = [], vendor = [], master = [] }: Filters, sort: Sort): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (country.length) params.set("country", country.join(","));
  if (vendor.length) params.set("vendor", vendor.join(","));
  if (master.length) params.set("master", master.join(","));
  if (sort.key !== defaultSort.key || sort.dir !== defaultSort.dir) {
    params.set("sort", sort.key);
    params.set("dir", sort.dir);
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
