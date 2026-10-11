/**
 * Unit tests for lib/origin.ts. Run: npm test (Vitest).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getOrders, getOrder } = await import("@/lib/orders");
const { originOf, originSummary } = await import("@/lib/origin");

describe("origin", () => {
  it("reads port and country from the ship terms", async () => {
    expect(originOf((await getOrder("TX9K2QP"))!)).toEqual({ port: "Ningbo", country: "CHN" });
  });

  it("groups the orders by country, most orders first", async () => {
    expect(originSummary(await getOrders())).toEqual([
      { code: "CHN", name: "China", ports: ["Ningbo", "Shanghai", "Hangzhou"], count: 3 },
      { code: "PAK", name: "Pakistan", ports: ["Karachi"], count: 1 },
    ]);
  });
});
