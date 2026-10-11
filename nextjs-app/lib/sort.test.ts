/**
 * Unit tests for lib/sort.ts. Run: npm test (Vitest).
 * They cover the URL parsing (including junk values), each sort, and the header-link logic.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getOrders } = await import("@/lib/orders");
const { listHref, nextSort, parseSort, sortOrders } = await import("@/lib/sort");

const orders = await getOrders();
const ids = (list: { poNumber: string }[]) => list.map((o) => o.poNumber);

describe("parseSort", () => {
  it("reads a valid sort and falls back on junk", () => {
    expect(parseSort("total", "desc")).toEqual({ key: "total", dir: "desc" });
    expect(parseSort("total", "sideways")).toEqual({ key: "total", dir: "asc" });
    expect(parseSort("<script>", "desc")).toEqual({ key: "ship", dir: "asc" });
    expect(parseSort(undefined, undefined)).toEqual({ key: "ship", dir: "asc" });
  });
});

describe("sortOrders", () => {
  it("sorts by total, biggest first", () => {
    expect(ids(sortOrders(orders, { key: "total", dir: "desc" }))).toEqual(["TX9K2QP", "TX9K5DC", "TX9K4MB", "TX9K3RA"]);
  });

  it("sorts by vendor name, ignoring the vendor number", () => {
    expect(ids(sortOrders(orders, { key: "vendor", dir: "asc" }))).toEqual(["TX9K2QP", "TX9K4MB", "TX9K3RA", "TX9K5DC"]);
  });

  it("does not change the list it was given", () => {
    const before = ids(orders);
    sortOrders(orders, { key: "total", dir: "asc" });
    expect(ids(orders)).toEqual(before);
  });
});

describe("header links", () => {
  it("flips direction on the same column and starts numbers biggest first", () => {
    expect(nextSort({ key: "total", dir: "desc" }, "total")).toEqual({ key: "total", dir: "asc" });
    expect(nextSort({ key: "ship", dir: "asc" }, "total")).toEqual({ key: "total", dir: "desc" });
    expect(nextSort({ key: "ship", dir: "asc" }, "vendor")).toEqual({ key: "vendor", dir: "asc" });
  });

  it("keeps the filters and leaves defaults out of the URL", () => {
    expect(listHref({}, { key: "ship", dir: "asc" })).toBe("/");
    expect(listHref({ status: "pending" }, { key: "total", dir: "desc" })).toBe("/?status=pending&sort=total&dir=desc");
    expect(listHref({ status: "pending", country: ["CHN", "PAK"], vendor: ["50201"] }, { key: "ship", dir: "asc" })).toBe(
      "/?status=pending&country=CHN%2CPAK&vendor=50201",
    );
  });
});
