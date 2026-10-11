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
