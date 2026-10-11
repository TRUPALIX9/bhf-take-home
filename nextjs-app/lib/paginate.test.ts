/**
 * Unit tests for lib/paginate.ts. Run: npm test (Vitest).
 */
import { describe, expect, it } from "vitest";
import { paginate, parsePaging } from "@/lib/paginate";

const items = [1, 2, 3, 4, 5];

describe("paginate", () => {
  it("returns one page of rows with the numbers for the pager", () => {
    expect(paginate(items, 2, 2)).toEqual({ items: [3, 4], page: 2, pageCount: 3, total: 5, from: 3, to: 4 });
    expect(paginate(items, 3, 2)).toMatchObject({ items: [5], from: 5, to: 5 });
  });

  it("shows the last page for a page past the end, and handles no rows", () => {
    expect(paginate(items, 99, 2)).toMatchObject({ page: 3, items: [5] });
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, pageCount: 1, total: 0, from: 0, to: 0 });
  });

  it("reads the URL and falls back on junk", () => {
    expect(parsePaging("2", "25")).toEqual({ page: 2, per: 25 });
    expect(parsePaging("-1", "0")).toEqual({ page: 1, per: 10 });
    expect(parsePaging("abc", "1000")).toEqual({ page: 1, per: 10 });
  });
});
