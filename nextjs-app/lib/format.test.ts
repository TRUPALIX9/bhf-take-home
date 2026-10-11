/**
 * Unit tests for the display helpers in lib/format.ts.
 * Run: npm test (Vitest). The pages show every number through these.
 */
import { describe, expect, it } from "vitest";
import {
  formatAddressLine,
  formatDate,
  formatMoney,
  formatPercent,
  formatUnitCost,
  lineTotals,
  splitCode,
  titleCase,
} from "@/lib/format";
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

// --- readable text ---

describe("readable text", () => {
  it("title-cases names without touching separators", () => {
    expect(titleCase("HARBOR POINT TRADING LTD")).toBe("Harbor Point Trading Ltd");
    expect(titleCase("331 DISTRIBUTION/NORTHEAST")).toBe("331 Distribution/Northeast");
  });

  it("formats phone and fax lines and leaves other lines alone", () => {
    expect(formatAddressLine("PHONE : 9085551040")).toBe("Phone (908) 555-1040");
    expect(formatAddressLine("FAX : 9085551099")).toBe("Fax (908) 555-1099");
    expect(formatAddressLine("PHONE : 922135550110")).toBe("PHONE : 922135550110"); // not a 10-digit US number
    expect(formatAddressLine("410 COMMERCE AVE")).toBe("410 COMMERCE AVE");
  });

  it("splits a printed code from the name", () => {
    expect(splitCode("610 JORDAN MILLER")).toEqual({ code: "610", name: "JORDAN MILLER" });
    expect(splitCode("JORDAN MILLER")).toEqual({ name: "JORDAN MILLER" });
  });

  it("formats shares as whole percents, with <1% for tiny ones", () => {
    expect(formatPercent(0.6612)).toBe("66%");
    expect(formatPercent(0.004)).toBe("<1%");
    expect(formatPercent(0)).toBe("0%");
  });
});
