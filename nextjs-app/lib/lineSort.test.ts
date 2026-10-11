/**
 * Unit tests for lib/lineSort.ts. Run: npm test (Vitest).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getOrder } = await import("@/lib/orders");
const { lineSortHref, nextLineSort, parseLineSort, sortLines } = await import("@/lib/lineSort");

const lines = (await getOrder("TX9K2QP"))!.lines;
const skus = (list: { sku: string }[]) => list.map((l) => l.sku);

describe("line sort", () => {
  it("keeps the printed order with no sort, and for junk in the URL", () => {
    expect(sortLines(lines, undefined)).toBe(lines);
    expect(parseLineSort("<script>", "desc")).toBeUndefined();
  });

  it("sorts by extended cost, largest first", () => {
    const sorted = sortLines(lines, { key: "extCost", dir: "desc" });
    expect(skus(sorted).slice(0, 2)).toEqual(["71097225", "71097232"]); // $124,801.60, $120,494.20
    expect(skus(lines)[0]).toBe("71097188"); // original untouched
  });

  it("cycles a header: sorted, reversed, then printed order", () => {
    const first = nextLineSort(undefined, "extCost");
    expect(first).toEqual({ key: "extCost", dir: "desc" });
    const second = nextLineSort(first, "extCost");
    expect(second).toEqual({ key: "extCost", dir: "asc" });
    expect(nextLineSort(second, "extCost")).toBeUndefined();
    expect(nextLineSort(undefined, "description")).toEqual({ key: "description", dir: "asc" });
  });

  it("builds the PO page URL", () => {
    expect(lineSortHref("TX9K2QP", { key: "extCost", dir: "desc" })).toBe("/orders/TX9K2QP?lines=extCost&dir=desc");
    expect(lineSortHref("TX9K2QP", undefined)).toBe("/orders/TX9K2QP");
  });
});
