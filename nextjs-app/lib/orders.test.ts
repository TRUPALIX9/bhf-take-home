/**
 * Unit tests for the order data layer (lib/orders.ts).
 * Run: npm test (Vitest). They read the same JSON seed the pages use,
 * including the sample PO written by the Python script with --json.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// "server-only" throws outside a React Server Components build.
vi.mock("server-only", () => ({}));

// Imported after the mock is registered, so lib/orders gets the empty stub.

const { getOrder, getOrders, isReviewStatus, orderExists, resetStatuses, setStatus } = await import(
  "@/lib/orders"
);
const { lineTotals } = await import("@/lib/format");

// Statuses live in memory, so start every test from the seed values.
beforeEach(() => resetStatuses());

// --- reading orders ---

describe("getOrders", () => {
  it("returns every seed order, earliest ship date first", async () => {
    const orders = await getOrders();
    expect(orders.map((o) => o.poNumber)).toEqual(["TX9K2QP", "TX9K3RA", "TX9K4MB", "TX9K5DC"]);
  });

  // Guards the seed data: a typo in any line would show a wrong total on the page.
  it("has line items that add up to each PO total", async () => {
    for (const order of await getOrders()) {
      expect(lineTotals(order.lines).extCost, order.poNumber).toBe(order.totalCost);
    }
  });
});

describe("getOrder", () => {
  it("finds the sample PO parsed by the Python script", async () => {
    const order = await getOrder("TX9K2QP");
    expect(order?.vendor[0]).toBe("50201 HARBOR POINT TRADING LTD");
    expect(order?.lines).toHaveLength(12);
    expect(order?.totalCost).toBe(447455.12);
    expect(order?.lines[0].upc).toBe("0091120032129");
  });

  it("returns undefined for an unknown PO", async () => {
    expect(await getOrder("NOPE")).toBeUndefined();
    expect(orderExists("NOPE")).toBe(false);
    expect(orderExists("TX9K2QP")).toBe(true);
  });
});

// --- review status ---

describe("setStatus", () => {
  it("sets approved and back to pending", async () => {
    expect((await getOrder("TX9K2QP"))?.status).toBe("pending");
    expect(await setStatus("TX9K2QP", "approved")).toBe("approved");
    expect((await getOrder("TX9K2QP"))?.status).toBe("approved");
    expect(await setStatus("TX9K2QP", "pending")).toBe("pending");
  });

  // The reason it sets instead of flips: a repeated or stale "approve" must not undo itself.
  it("is idempotent: approving twice leaves the PO approved", async () => {
    await setStatus("TX9K2QP", "approved");
    await setStatus("TX9K2QP", "approved");
    expect((await getOrder("TX9K2QP"))?.status).toBe("approved");
  });

  it("keeps a correction note only while the PO needs correction", async () => {
    await setStatus("TX9K2QP", "needs_correction", "Wrong ship date");
    expect((await getOrder("TX9K2QP"))?.correctionNote).toBe("Wrong ship date");
    await setStatus("TX9K2QP", "pending");
    expect((await getOrder("TX9K2QP"))?.correctionNote).toBeUndefined();
  });

  // TX9K3RA is approved in the seed, so both statuses are checked as unchanged.
  it("changes only the PO it is given", async () => {
    await setStatus("TX9K2QP", "approved");
    expect((await getOrder("TX9K4MB"))?.status).toBe("pending");
    expect((await getOrder("TX9K3RA"))?.status).toBe("approved");
  });

  it("rejects an unknown PO and changes nothing", async () => {
    const before = (await getOrders()).map((o) => o.status);
    await expect(setStatus("NOPE", "approved")).rejects.toThrow("Unknown PO NOPE");
    expect((await getOrders()).map((o) => o.status)).toEqual(before);
  });
});

describe("isReviewStatus", () => {
  // The action uses this to reject anything else sent in the form.
  it("accepts only the three real statuses", () => {
    expect(isReviewStatus("approved")).toBe(true);
    expect(isReviewStatus("pending")).toBe(true);
    expect(isReviewStatus("needs_correction")).toBe(true);
    expect(isReviewStatus("cancelled")).toBe(false);
    expect(isReviewStatus(null)).toBe(false);
  });
});

// --- seed data shape ---
// The JSON is cast to Order[] without a runtime check, so this test is the check:
// a missing field or a wrong type in data/orders.json fails here, not on a page.
describe("seed data", () => {
  it("has every field with the right type on every order and line", async () => {
    for (const o of await getOrders()) {
      expect(o.poNumber, "poNumber").toMatch(/^[A-Z0-9]+$/);
      expect(o.poDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(o.shipDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(isReviewStatus(o.status), `${o.poNumber} status`).toBe(true);
      for (const block of [o.vendor, o.shipTo, o.billTo]) expect(block.length).toBeGreaterThan(0);
      expect(o.lines.length).toBeGreaterThan(0);
      for (const l of o.lines) {
        expect(l.upc, `${o.poNumber} ${l.sku} upc`).toMatch(/^\d{12,14}$/);
        expect(l.cartons * l.casePack, `${o.poNumber} ${l.sku} qty`).toBe(l.extQty);
        for (const n of [l.retail, l.cost, l.extCost, l.cube, l.kilograms]) expect(Number.isFinite(n)).toBe(true);
      }
    }
  });

  it("has no duplicate PO numbers", async () => {
    const numbers = (await getOrders()).map((o) => o.poNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});
