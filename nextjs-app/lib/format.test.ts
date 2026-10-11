/**
 * Unit tests for the display helpers in lib/format.ts.
 * Run: npm test (Vitest). The pages show every number through these.
 */
import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatUnitCost, lineTotals } from "@/lib/format";
import type { LineItem } from "@/lib/types";

// --- formatting ---

describe("format", () => {
  it("formats money with cents and unit cost with 3 decimals", () => {
    expect(formatMoney(447455.12)).toBe("$447,455.12");
    expect(formatUnitCost(49.4)).toBe("$49.400");
  });

  // A plain new Date("2026-05-02") is UTC midnight, which shows as May 1 west of UTC.
  it("formats ISO dates without shifting the day", () => {
    expect(formatDate("2026-05-02")).toBe("May 2, 2026");
  });

  // --- totals ---

  // 0.1 + 0.1 + 0.1 is 0.30000000000000004 in floating point; the total must still be 0.3.
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
