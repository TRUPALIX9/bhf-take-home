/**
 * The PO list filters: status (the tabs), the Filters menu (origin countries, vendors), and
 * the master PO (set by the link on a PO's "Ref master PO", shown as a chip).
 * They live in the URL (?status=pending&country=CHN,PAK&vendor=50201), so every view is a
 * shareable link and the server can render it. Pure functions, safe on server and client.
 *
 * Inside one group a PO matches any selected value (China OR Pakistan); across groups it
 * must match every group that has a selection (origin AND vendor).
 */
import { vendorNumber } from "@/lib/format";
import { originOf } from "@/lib/origin";
import type { Order, ReviewStatus } from "@/lib/types";

export type ListFilters = { status?: ReviewStatus; country: string[]; vendor: string[]; master?: string };

/** "CHN,PAK" -> ["CHN", "PAK"], keeping only values that look right and dropping repeats. */
function parseList(value: string | undefined, pattern: RegExp): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").filter((v) => pattern.test(v)))];
}

/** Reads the filters from URL values. Anything that isn't a real value is ignored. */
export function parseFilters(params: { status?: string; country?: string; vendor?: string; master?: string }): ListFilters {
  return {
    status: params.status === "pending" || params.status === "approved" ? params.status : undefined,
    country: parseList(params.country, /^[A-Z]{3}$/),
    vendor: parseList(params.vendor, /^\d{1,10}$/),
    master: params.master && /^[A-Z0-9]{4,12}$/.test(params.master) ? params.master : undefined,
  };
}

/** True when the order passes the status and every filter group that has a selection. */
export function matches(order: Order, { status, country, vendor, master }: ListFilters): boolean {
  const orderCountry = originOf(order).country ?? "";
  const orderVendor = vendorNumber(order) ?? "";
  return (
    (!status || order.status === status) &&
    (country.length === 0 || country.includes(orderCountry)) &&
    (vendor.length === 0 || vendor.includes(orderVendor)) &&
    (!master || order.refMasterPo === master)
  );
}

/** Number of values selected in the Filters menu (not counting the status tab). */
export const activeMenuFilters = ({ country, vendor }: ListFilters) => country.length + vendor.length;

/** Same as parseFilters, for client components that read the URL with useSearchParams(). */
export function filtersFromSearchParams(params: { get(name: string): string | null }): ListFilters {
  return parseFilters({
    status: params.get("status") ?? undefined,
    country: params.get("country") ?? undefined,
    vendor: params.get("vendor") ?? undefined,
    master: params.get("master") ?? undefined,
  });
}
