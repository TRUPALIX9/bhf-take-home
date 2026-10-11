/**
 * Unit tests for lib/filters.ts. Run: npm test (Vitest).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getOrders } = await import("@/lib/orders");
const { filterOptions, matches, parseFilters } = await import("@/lib/filters");

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

  it("treats origin and vendor as one tree: a country OR a vendor", () => {
    // China, plus Indus Home Mills (which ships from Pakistan): all four POs.
    expect(ids({ country: ["CHN"], vendor: ["50417"] })).toEqual(["TX9K2QP", "TX9K3RA", "TX9K4MB", "TX9K5DC"]);
    expect(ids({ vendor: ["50201", "50417"] })).toEqual(["TX9K2QP", "TX9K4MB"]);
  });

  it("requires the tree, the master PO list and the status to match together", () => {
    expect(ids({ status: "pending", country: ["CHN"] })).toEqual(["TX9K2QP", "TX9K5DC"]);
    expect(ids({ country: ["CHN"], master: ["TX9H2QN"] })).toEqual(["TX9K5DC"]);
  });
});

describe("filterOptions", () => {
  const opts = (f: Partial<Parameters<typeof matches>[1]>) => filterOptions(orders, { ...none, ...f });

  it("builds the origin tree: countries with their vendors, most POs first", () => {
    const { origin } = opts({});
    expect(origin.map((c) => `${c.value}:${c.count}`)).toEqual(["CHN:3", "PAK:1"]);
    expect(origin[1].vendors).toEqual([{ value: "50417", label: "Indus Home Mills Pvt Ltd", count: 1 }]);
    expect(origin[0].vendors.map((v) => v.label)).toEqual([
      "Harbor Point Trading Ltd",
      "Larkshore Textile Co Ltd",
      "Westlake Fiber Arts Ltd",
    ]);
  });

  it("only offers what fits the status tab and the master PO list", () => {
    // Approved has one PO: TX9K3RA (Larkshore, China, master TX9H1LM).
    const { origin, master } = opts({ status: "approved" });
    expect(origin.map((c) => c.value)).toEqual(["CHN"]);
    expect(origin[0].vendors.map((v) => v.value)).toEqual(["50388"]);
    expect(master.map((m) => `${m.value}:${m.count}`)).toEqual(["TX9H1LM:1"]);
  });

  it("doesn't let the tree hide its own options, and keeps ticked values", () => {
    expect(opts({ country: ["CHN"] }).origin.map((c) => c.value)).toEqual(["CHN", "PAK"]);
    expect(opts({ status: "approved", country: ["PAK"] }).origin.map((c) => `${c.value}:${c.count}`)).toEqual(["CHN:1", "PAK:0"]);
  });
});

describe("search", () => {
  it("finds POs by number, vendor, master PO, country, or anything on the lines", () => {
    expect(ids({ q: "tx9k3ra" })).toEqual(["TX9K3RA"]);
    expect(ids({ q: "harbor" })).toEqual(["TX9K2QP"]);
    expect(ids({ q: "TX9H2QN" })).toEqual(["TX9K4MB", "TX9K5DC"]);
    expect(ids({ q: "pakistan" })).toEqual(["TX9K4MB"]);
    expect(ids({ q: "simone" })).toEqual(["TX9K2QP"]); // a comforter description on TX9K2QP's lines
    expect(ids({ q: "0091120032129" })).toEqual(["TX9K2QP"]); // a UPC
  });

  it("combines with the other filters and trims long or blank text", () => {
    expect(ids({ q: "china", status: "approved" })).toEqual(["TX9K3RA"]);
    expect(parseFilters({ q: "   " }).q).toBeUndefined();
    expect(parseFilters({ q: "x".repeat(100) }).q).toHaveLength(60);
  });
});
