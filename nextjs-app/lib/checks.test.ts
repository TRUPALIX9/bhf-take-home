/**
 * Unit tests for lib/checks.ts. Run: npm test (Vitest).
 * They prove each check catches the mistake it is for, using a tampered copy of the sample PO.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getOrder } = await import("@/lib/orders");
const { reviewChecks } = await import("@/lib/checks");

const sample = (await getOrder("TX9K2QP"))!;

/** A copy of the sample PO with the first line changed. */
const withFirstLine = (change: object) => ({
  ...sample,
  lines: [{ ...sample.lines[0], ...change }, ...sample.lines.slice(1)],
});

describe("reviewChecks", () => {
  it("passes every check on the sample PO", () => {
    expect(reviewChecks(sample).map((c) => c.ok)).toEqual([true, true, true]);
  });

  it("catches a wrong unit count", () => {
    const [qty] = reviewChecks(withFirstLine({ extQty: 135 }));
    expect(qty.ok).toBe(false);
    expect(qty.detail).toContain("71097188");
  });

  it("catches a wrong extended cost, and the total that no longer adds up", () => {
    const [, cost, total] = reviewChecks(withFirstLine({ extCost: 6718.41 }));
    expect(cost.ok).toBe(false);
    expect(total.ok).toBe(false);
  });
});
