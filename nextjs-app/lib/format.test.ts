import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatUnitCost, lineTotals } from "@/lib/format";
import type { LineItem } from "@/lib/types";

describe("format", () => {
  it("formats money with cents and unit cost with 3 decimals", () => {
    expect(formatMoney(447455.12)).toBe("$447,455.12");
    expect(formatUnitCost(49.4)).toBe("$49.400");
  });

  it("formats ISO dates without shifting the day", () => {
    expect(formatDate("2026-05-02")).toBe("May 2, 2026");
  });

  it("sums line totals and rounds money to cents", () => {
    const line = { cartons: 1, extQty: 2, extCost: 0.1, kilograms: 0.1 } as LineItem;
    expect(lineTotals([line, line, line])).toEqual({
      cartons: 3,
      extQty: 6,
      extCost: 0.3,
      kilograms: 0.3,
    });
  });
});
