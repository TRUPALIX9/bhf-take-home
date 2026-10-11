/**
 * Unit tests for lib/filters.ts. Run: npm test (Vitest).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getOrders } = await import("@/lib/orders");
const { facetOptions, matches, parseFilters } = await import("@/lib/filters");

const orders = await getOrders();
const none = { country: [], vendor: [], master: [] };
const ids = (f: Partial<Parameters<typeof matches>[1]>) =>
  orders.filter((o) => matches(o, { ...none, ...f })).map((o) => o.poNumber);

describe("filters", () => {
  it("reads lists from the URL, drops junk and repeats", () => {
    expect(parseFilters({ status: "pending", country: "CHN,PAK,CHN", vendor: "50201" })).toEqual({
      status: "pending",
      country: ["CHN", "PAK"],
      vendor: ["50201"],
      master: [],
    });
    expect(parseFilters({ status: "nope", country: "china,<b>", vendor: "50201; DROP" })).toEqual({
      status: undefined,
      country: [],
      vendor: [],
      master: [],
    });
  });

  it("matches any value inside a group", () => {
    expect(ids({ country: ["PAK"] })).toEqual(["TX9K4MB"]);
    expect(ids({ vendor: ["50201", "50417"] })).toEqual(["TX9K2QP", "TX9K4MB"]);
  });

  it("filters by master PO, the parent order several POs share", () => {
    expect(ids({ master: ["TX9H1LM"] })).toEqual(["TX9K2QP", "TX9K3RA"]);
    expect(parseFilters({ master: "TX9H1LM" }).master).toEqual(["TX9H1LM"]);
    expect(parseFilters({ master: "../x" }).master).toEqual([]);
  });

  it("requires every group, and the status, to match", () => {
    expect(ids({ status: "pending", country: ["CHN"] })).toEqual(["TX9K2QP", "TX9K5DC"]);
    expect(ids({ country: ["CHN"], vendor: ["50201", "50417"] })).toEqual(["TX9K2QP"]);
    expect(ids({ vendor: ["50201"], country: ["PAK"] })).toEqual([]);
  });
});

describe("facetOptions", () => {
  const options = (f: Partial<Parameters<typeof matches>[1]>) =>
    Object.fromEntries(facetOptions(orders, { ...none, ...f }).map((g) => [g.facet, g.options.map((o) => `${o.value}:${o.count}`)]));

  it("counts every value when nothing is set, most POs first", () => {
    expect(options({}).country).toEqual(["CHN:3", "PAK:1"]);
    expect(options({}).master).toEqual(["TX9H1LM:2", "TX9H2QN:2"]);
  });

  it("only offers values that fit the status tab", () => {
    // Approved has one PO (TX9K3RA, Shanghai, master TX9H1LM): nothing else is offered.
    expect(options({ status: "approved" })).toEqual({ country: ["CHN:1"], vendor: ["50388:1"], master: ["TX9H1LM:1"] });
  });

  it("doesn't let a facet hide its own other values, and keeps ticked values", () => {
    expect(options({ country: ["CHN"] }).country).toEqual(["CHN:3", "PAK:1"]);
    expect(options({ status: "approved", country: ["PAK"] }).country).toEqual(["CHN:1", "PAK:0"]);
  });
});
