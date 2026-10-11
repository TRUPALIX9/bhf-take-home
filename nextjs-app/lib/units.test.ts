/**
 * Unit tests for lib/units.ts. Run: npm test (Vitest).
 */
import { describe, expect, it } from "vitest";
import { formatVolume, formatWeight, parseUnits, unitLabels } from "@/lib/units";

describe("units", () => {
  it("shows the PO's own units by default and converts to imperial on request", () => {
    expect(parseUnits(undefined)).toBe("metric");
    expect(parseUnits("nonsense")).toBe("metric");
    expect(formatWeight(7.72, "metric")).toBe("7.72");
    expect(formatWeight(7.72, "imperial")).toBe("17.02"); // 7.72 kg × 2.20462
    expect(formatVolume(0.0991, "metric")).toBe("0.0991");
    expect(formatVolume(0.0991, "imperial")).toBe("3.50"); // 0.0991 m³ × 35.3147
    expect(unitLabels("imperial")).toEqual({ weight: "lb", volume: "ft³" });
  });
});
