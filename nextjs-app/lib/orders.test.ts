import { beforeEach, describe, expect, it, vi } from "vitest";

// "server-only" throws outside a React Server Components build.
vi.mock("server-only", () => ({}));

const { getOrder, getOrders, resetStatuses, toggleStatus } = await import("@/lib/orders");
const { lineTotals } = await import("@/lib/format");

beforeEach(() => resetStatuses());

describe("getOrders", () => {
  it("returns every seed order, earliest ship date first", () => {
    const orders = getOrders();
    expect(orders.map((o) => o.poNumber)).toEqual(["TX9K2QP", "TX9K3RA", "TX9K4MB", "TX9K5DC"]);
  });

  it("has line items that add up to each PO total", () => {
    for (const order of getOrders()) {
      expect(lineTotals(order.lines).extCost, order.poNumber).toBe(order.totalCost);
    }
  });
});

describe("getOrder", () => {
  it("finds the sample PO parsed by the Python script", () => {
    const order = getOrder("TX9K2QP");
    expect(order?.vendor[0]).toBe("50201 HARBOR POINT TRADING LTD");
    expect(order?.lines).toHaveLength(12);
    expect(order?.totalCost).toBe(447455.12);
    expect(order?.lines[0].upc).toBe("0091120032129");
  });

  it("returns undefined for an unknown PO", () => {
    expect(getOrder("NOPE")).toBeUndefined();
  });
});

describe("toggleStatus", () => {
  it("flips pending to approved and back", () => {
    expect(getOrder("TX9K2QP")?.status).toBe("pending");
    expect(toggleStatus("TX9K2QP")).toBe("approved");
    expect(getOrder("TX9K2QP")?.status).toBe("approved");
    expect(toggleStatus("TX9K2QP")).toBe("pending");
  });

  it("changes only the PO it is given", () => {
    toggleStatus("TX9K2QP");
    expect(getOrder("TX9K4MB")?.status).toBe("pending");
    expect(getOrder("TX9K3RA")?.status).toBe("approved");
  });

  it("throws for an unknown PO and changes nothing", () => {
    const before = getOrders().map((o) => o.status);
    expect(() => toggleStatus("NOPE")).toThrow("Unknown PO NOPE");
    expect(getOrders().map((o) => o.status)).toEqual(before);
  });
});
