import { beforeEach, describe, expect, it, vi } from "vitest";

// "server-only" throws outside a React Server Components build.
vi.mock("server-only", () => ({}));

const { getOrder, getOrders, orderExists, resetStatuses, toggleStatus } = await import(
  "@/lib/orders"
);
const { lineTotals } = await import("@/lib/format");

beforeEach(() => resetStatuses());

describe("getOrders", () => {
  it("returns every seed order, earliest ship date first", async () => {
    const orders = await getOrders();
    expect(orders.map((o) => o.poNumber)).toEqual(["TX9K2QP", "TX9K3RA", "TX9K4MB", "TX9K5DC"]);
  });

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

describe("toggleStatus", () => {
  it("flips pending to approved and back", async () => {
    expect((await getOrder("TX9K2QP"))?.status).toBe("pending");
    expect(await toggleStatus("TX9K2QP")).toBe("approved");
    expect((await getOrder("TX9K2QP"))?.status).toBe("approved");
    expect(await toggleStatus("TX9K2QP")).toBe("pending");
  });

  it("changes only the PO it is given", async () => {
    await toggleStatus("TX9K2QP");
    expect((await getOrder("TX9K4MB"))?.status).toBe("pending");
    expect((await getOrder("TX9K3RA"))?.status).toBe("approved");
  });

  it("rejects an unknown PO and changes nothing", async () => {
    const before = (await getOrders()).map((o) => o.status);
    await expect(toggleStatus("NOPE")).rejects.toThrow("Unknown PO NOPE");
    expect((await getOrders()).map((o) => o.status)).toEqual(before);
  });
});
