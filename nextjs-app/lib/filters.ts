/**
 * Filtering for the PO list, as faceted search.
 *
 * - Status (All / Pending review / Approved / Needs correction) is a filter too, shown as tabs because there is
 *   always exactly one and it is the main way people work through the list.
 * - The Filters menu has three facets: origin country, vendor, master PO. Inside a facet a PO
 *   matches any ticked value (OR); across facets and the status it must match each one (AND).
 * - Each facet only offers values that would return POs given everything else that is set,
 *   with a count, ordered by count. A ticked value always stays visible so it can be unticked.
 *
 * Everything lives in the URL (?status=pending&country=CHN,PAK&vendor=50201&master=TX9H1LM),
 * so every view is a shareable link and the server can render it. Pure functions.
 */
import { titleCase, vendorName, vendorNumber } from "@/lib/format";
import { countryName, originOf } from "@/lib/origin";
import { reviewStatuses, type Order, type ReviewStatus } from "@/lib/types";

export type Facet = "country" | "vendor" | "master";
export const facets: Facet[] = ["country", "vendor", "master"];
export type ListFilters = { status?: ReviewStatus } & Record<Facet, string[]>;

// What each facet reads from an order, how its values must look in the URL, and how to label them.
const facetDef: Record<Facet, { valueOf: (o: Order) => string | undefined; pattern: RegExp; title: string }> = {
  country: { valueOf: (o) => originOf(o).country, pattern: /^[A-Z]{3}$/, title: "Origin" },
  vendor: { valueOf: (o) => vendorNumber(o), pattern: /^\d{1,10}$/, title: "Vendor" },
  master: { valueOf: (o) => o.refMasterPo, pattern: /^[A-Z0-9]{4,12}$/, title: "Master PO" },
};

/** "CHN,PAK" -> ["CHN", "PAK"], keeping only values that look right and dropping repeats. */
function parseList(value: string | undefined, pattern: RegExp): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").filter((v) => pattern.test(v)))];
}

/** Reads the filters from URL values. Anything that isn't a real value is ignored. */
export function parseFilters(params: Partial<Record<"status" | Facet, string>>): ListFilters {
  return {
    status: reviewStatuses.find((s) => s === params.status),
    country: parseList(params.country, facetDef.country.pattern),
    vendor: parseList(params.vendor, facetDef.vendor.pattern),
    master: parseList(params.master, facetDef.master.pattern),
  };
}

/** Same as parseFilters, for client components that read the URL with useSearchParams(). */
export function filtersFromSearchParams(params: { get(name: string): string | null }): ListFilters {
  return parseFilters({
    status: params.get("status") ?? undefined,
    country: params.get("country") ?? undefined,
    vendor: params.get("vendor") ?? undefined,
    master: params.get("master") ?? undefined,
  });
}

/** True when the order passes the status and every facet that has a selection. */
export function matches(order: Order, filters: ListFilters): boolean {
  if (filters.status && order.status !== filters.status) return false;
  return facets.every((f) => filters[f].length === 0 || filters[f].includes(facetDef[f].valueOf(order) ?? ""));
}

/** Number of facet values ticked (not counting the status tab). */
export const activeFacetCount = (filters: ListFilters) => facets.reduce((n, f) => n + filters[f].length, 0);

export type FacetOption = { value: string; label: string; count: number };
export type FacetGroup = { facet: Facet; title: string; options: FacetOption[] };

/** Display label for a facet value: "CHN" -> "China", "50201" -> "Harbor Point Trading Ltd". */
function labelFor(facet: Facet, value: string, orders: Order[]): string {
  if (facet === "country") return countryName(value);
  if (facet === "vendor") {
    const order = orders.find((o) => vendorNumber(o) === value);
    return order ? titleCase(vendorName(order)) : `Vendor #${value}`;
  }
  return value;
}

/**
 * The options for every facet, given the current filters. A facet's counts use all the
 * other filters (including the status tab) but not itself, so ticking China doesn't hide
 * Pakistan. Values with no POs are left out unless they are ticked.
 */
export function facetOptions(orders: Order[], filters: ListFilters): FacetGroup[] {
  return facets.map((facet) => {
    const others = { ...filters, [facet]: [] };
    const counts = new Map<string, number>();
    for (const o of orders) {
      if (!matches(o, others)) continue;
      const value = facetDef[facet].valueOf(o);
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    for (const ticked of filters[facet]) if (!counts.has(ticked)) counts.set(ticked, 0);
    const options = [...counts]
      .map(([value, count]) => ({ value, label: labelFor(facet, value, orders), count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    return { facet, title: facetDef[facet].title, options };
  });
}
