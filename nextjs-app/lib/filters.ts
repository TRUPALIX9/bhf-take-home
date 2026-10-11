/**
 * Filtering for the PO list, as faceted search.
 *
 * - Status (All / Pending review / Approved / Needs correction) is a filter too, shown as tabs because there is
 *   always exactly one and it is the main way people work through the list.
 * - The Filters menu has two groups, laid out the way a person thinks about them:
 *     Origin & vendor: a tree, country > the vendors that ship from it. Ticking a country means
 *       "everything from there"; ticking a vendor adds just that vendor. A PO matches if its
 *       country OR its vendor is ticked.
 *     Master PO: a list.
 *   A PO must match each group that has something ticked, and the status tab (AND).
 * - Each group only offers values that would return POs given the other group and the tab,
 *   with counts. A ticked value always stays visible so it can be unticked.
 *
 * Everything lives in the URL (?status=pending&country=CHN,PAK&vendor=50201&master=TX9H1LM),
 * so every view is a shareable link and the server can render it. Pure functions.
 */
import { titleCase, vendorName, vendorNumber } from "@/lib/format";
import { countryName, originOf } from "@/lib/origin";
import { reviewStatuses, type Order, type ReviewStatus } from "@/lib/types";

export type Facet = "country" | "vendor" | "master";
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

/** True when the order passes the status tab, the origin & vendor tree, and the master PO list. */
export function matches(order: Order, filters: ListFilters): boolean {
  if (filters.status && order.status !== filters.status) return false;
  const { country, vendor, master } = filters;
  const inOrigin =
    (country.length === 0 && vendor.length === 0) ||
    country.includes(facetDef.country.valueOf(order) ?? "") ||
    vendor.includes(facetDef.vendor.valueOf(order) ?? "");
  const inMaster = master.length === 0 || master.includes(order.refMasterPo);
  return inOrigin && inMaster;
}


export type FacetOption = { value: string; label: string; count: number };

/** Display label for a facet value: "CHN" -> "China", "50201" -> "Harbor Point Trading Ltd". */
function labelFor(facet: Facet, value: string, orders: Order[]): string {
  if (facet === "country") return countryName(value);
  if (facet === "vendor") {
    const order = orders.find((o) => vendorNumber(o) === value);
    return order ? titleCase(vendorName(order)) : `Vendor #${value}`;
  }
  return value;
}

export type VendorNode = FacetOption; // value = vendor number
export type CountryNode = FacetOption & { vendors: VendorNode[] };

/**
 * The options for the Filters panel, given the current filters.
 * - origin: countries, each with the vendors that ship from it. Counts use the status tab and
 *   the master PO list, but not the tree itself, so ticking China doesn't hide Pakistan.
 * - master: master POs, counted with the status tab and the tree.
 * Anything with no POs is left out unless it is ticked. Larger counts come first.
 */
export function filterOptions(orders: Order[], filters: ListFilters): { origin: CountryNode[]; master: FacetOption[] } {
  const byCount = (a: FacetOption, b: FacetOption) => b.count - a.count || a.label.localeCompare(b.label);

  // --- Origin & vendor tree ---
  const forTree = orders.filter((o) => matches(o, { ...filters, country: [], vendor: [] }));
  const countries = new Map<string, { count: number; vendors: Map<string, number> }>();
  for (const o of forTree) {
    const c = facetDef.country.valueOf(o);
    const v = facetDef.vendor.valueOf(o);
    if (!c || !v) continue;
    const node = countries.get(c) ?? { count: 0, vendors: new Map() };
    node.count += 1;
    node.vendors.set(v, (node.vendors.get(v) ?? 0) + 1);
    countries.set(c, node);
  }
  // Keep ticked values visible even when they have nothing left.
  for (const c of filters.country) if (!countries.has(c)) countries.set(c, { count: 0, vendors: new Map() });
  for (const v of filters.vendor) {
    const home = orders.find((o) => facetDef.vendor.valueOf(o) === v);
    const c = home && facetDef.country.valueOf(home);
    if (!c) continue;
    const node = countries.get(c) ?? { count: 0, vendors: new Map() };
    if (!node.vendors.has(v)) node.vendors.set(v, 0);
    countries.set(c, node);
  }
  const origin = [...countries]
    .map(([value, node]) => ({
      value,
      label: labelFor("country", value, orders),
      count: node.count,
      vendors: [...node.vendors]
        .map(([v, count]) => ({ value: v, label: labelFor("vendor", v, orders), count }))
        .sort(byCount),
    }))
    .sort(byCount);

  // --- Master PO list ---
  const masterCounts = new Map<string, number>();
  for (const o of orders) {
    if (matches(o, { ...filters, master: [] })) masterCounts.set(o.refMasterPo, (masterCounts.get(o.refMasterPo) ?? 0) + 1);
  }
  for (const m of filters.master) if (!masterCounts.has(m)) masterCounts.set(m, 0);
  const master = [...masterCounts].map(([value, count]) => ({ value, label: value, count })).sort(byCount);

  return { origin, master };
}

/** Label for a ticked value, for the chips: "China", "Harbor Point Trading Ltd", "TX9H1LM". */
export function filterLabel(facet: Facet, value: string, orders: Order[]): string {
  return labelFor(facet, value, orders);
}
