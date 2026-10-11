/**
 * Unit tests for lib/filters.ts. Run: npm test (Vitest).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getOrders } = await import("@/lib/orders");
const { matches, parseFilters } = await import("@/lib/filters");

const orders = await getOrders();
const none = { country: [], vendor: [] };
const ids = (f: Partial<Parameters<typeof matches>[1]>) =>
  orders.filter((o) => matches(o, { ...none, ...f })).map((o) => o.poNumber);

describe("filters", () => {
  it("reads lists from the URL, drops junk and repeats", () => {
    expect(parseFilters({ status: "pending", country: "CHN,PAK,CHN", vendor: "50201" })).toEqual({
      status: "pending",
      country: ["CHN", "PAK"],
      vendor: ["50201"],
      master: undefined,
    });
    expect(parseFilters({ status: "nope", country: "china,<b>", vendor: "50201; DROP" })).toEqual({
      status: undefined,
      country: [],
      vendor: [],
      master: undefined,
    });
  });

  it("matches any value inside a group", () => {
    expect(ids({ country: ["PAK"] })).toEqual(["TX9K4MB"]);
    expect(ids({ vendor: ["50201", "50417"] })).toEqual(["TX9K2QP", "TX9K4MB"]);
  });

  it("filters by master PO, the parent order several POs share", () => {
    expect(ids({ master: "TX9H1LM" })).toEqual(["TX9K2QP", "TX9K3RA"]);
    expect(parseFilters({ master: "TX9H1LM" }).master).toBe("TX9H1LM");
    expect(parseFilters({ master: "../x" }).master).toBeUndefined();
  });

  it("requires every group, and the status, to match", () => {
    expect(ids({ status: "pending", country: ["CHN"] })).toEqual(["TX9K2QP", "TX9K5DC"]);
    expect(ids({ country: ["CHN"], vendor: ["50201", "50417"] })).toEqual(["TX9K2QP"]);
    expect(ids({ vendor: ["50201"], country: ["PAK"] })).toEqual([]);
  });
});
