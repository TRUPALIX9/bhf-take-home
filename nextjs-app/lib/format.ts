/**
 * Display formatters for money, counts and dates, plus line-item totals.
 * Pure functions with no server-only imports; used by the list and detail components.
 */
import type { LineItem, Order } from "@/lib/types";

// --- Formatters ---
// Created once at module load and reused; building Intl formatters on every call is slow.
// Locale and time zone are fixed so server and browser always produce the same text.
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd3 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 3,
});
const count = new Intl.NumberFormat("en-US");
const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** 1234.5 -> "$1,234.50" */
export const formatMoney = (n: number) => usd2.format(n);
/** Unit cost keeps 3 decimals, as printed on the PO. */
export const formatUnitCost = (n: number) => usd3.format(n);
/** 12000 -> "12,000" */
export const formatCount = (n: number) => count.format(n);
/** "2026-05-02" -> "May 2, 2026". Read as UTC so the day never shifts. */
export const formatDate = (iso: string) => date.format(new Date(`${iso}T00:00:00Z`));

/** "50201 HARBOR POINT TRADING LTD" -> "HARBOR POINT TRADING LTD" */
export const vendorName = (order: Order) => order.vendor[0].replace(/^\d+\s+/, "");

/** Splits a printed "code name" pair: "610 JORDAN MILLER" -> { code: "610", name: "JORDAN MILLER" }. */
export function splitCode(text: string): { code?: string; name: string } {
  const m = text.match(/^(\d+)\s+(.*)$/);
  return m ? { code: m[1], name: m[2] } : { name: text };
}

/** "50201 HARBOR POINT TRADING LTD" -> "50201"; undefined when the PO prints no number. */
export const vendorNumber = (order: Order) => order.vendor[0].match(/^(\d+)\s/)?.[1];

/**
 * "HARBOR POINT TRADING LTD" -> "Harbor Point Trading Ltd". Used for names in
 * headings and tables, where all caps reads as shouting. Addresses stay as printed.
 */
export const titleCase = (text: string) =>
  text.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());

/** "PHONE : 9085551040" -> "Phone (908) 555-1040". Other address lines are returned unchanged. */
export function formatAddressLine(line: string): string {
  const m = line.match(/^(PHONE|FAX)\s*:\s*(\d{3})(\d{3})(\d{4})$/);
  return m ? `${m[1] === "PHONE" ? "Phone" : "Fax"} (${m[2]}) ${m[3]}-${m[4]}` : line;
}

/** 0.6612 -> "66%"; tiny non-zero shares show as "<1%" instead of "0%". */
export function formatPercent(share: number): string {
  if (share > 0 && share < 0.01) return "<1%";
  return `${Math.round(share * 100)}%`;
}

// --- Totals ---
/** Sums the line items for the totals row, to check against the PO header. */
export function lineTotals(lines: LineItem[]) {
  const sum = (pick: (l: LineItem) => number) => lines.reduce((t, l) => t + pick(l), 0);
  return {
    cartons: sum((l) => l.cartons),
    extQty: sum((l) => l.extQty),
    // Round to cents so float noise doesn't show up as a mismatch.
    extCost: Math.round(sum((l) => l.extCost) * 100) / 100,
    kilograms: Math.round(sum((l) => l.kilograms) * 100) / 100,
  };
}
