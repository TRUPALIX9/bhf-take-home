/**
 * Shared data types for purchase orders. Types only, so nothing here reaches the bundle.
 * They describe data/orders.json and are used by lib/, app/ and components/.
 */

/** Where a PO is in review: waiting for a check, or cleared for downstream systems. */
export type ReviewStatus = "pending" | "approved";

/** One SKU row on a purchase order. Money is in US dollars. */
export type LineItem = {
  dept: string;
  sku: string;
  upc: string;
  vendorPart: string;
  description: string;
  retail: number;
  cost: number;
  extCost: number;
  cartons: number;
  casePack: number;
  extQty: number;
  cube: number;
  kilograms: number;
};

/** One purchase order, with header fields as printed on the PO and its line items. */
export type Order = {
  poNumber: string;
  refMasterPo: string;
  poDate: string; // ISO date, e.g. "2026-03-14"
  shipDate: string; // ISO date
  buyer: string;
  shipTerms: string;
  vendor: string[]; // address block, one entry per printed line
  shipTo: string[];
  billTo: string[];
  totalCost: number;
  status: ReviewStatus; // status in the seed file; changes live in lib/orders.ts
  lines: LineItem[];
};
