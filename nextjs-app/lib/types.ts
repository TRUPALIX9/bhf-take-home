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
