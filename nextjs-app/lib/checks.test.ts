/**
 * Unit tests for lib/checks.ts. Run: npm test (Vitest).
 * Each test changes one thing on a copy of the sample PO and checks the matching problem is
 * reported in plain words, with the right numbers.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getOrder } = await import("@/lib/orders");
const { checkRules, checkSummary, findProblems, problemsAsReason } = await import("@/lib/checks");

const sample = (await getOrder("TX9K2QP"))!;
const first = sample.lines[0]; // SKU 71097188: 68 cartons of 2 = 136 units at $49.400 = $6,718.40

/** A copy of the sample with the first line changed. */
const withFirstLine = (change: object) => ({ ...sample, lines: [{ ...first, ...change }, ...sample.lines.slice(1)] });
const titles = (order: typeof sample) => findProblems(order).map((p) => p.title);

describe("findProblems", () => {
  it("finds nothing wrong with the sample PO", () => {
    expect(findProblems(sample)).toEqual([]);
  });

  it("explains a wrong unit count with the numbers", () => {
    const [problem] = findProblems(withFirstLine({ extQty: 135, extCost: 49.4 * 135 }));
    expect(problem.title).toBe("Unit count is wrong");
    expect(problem.detail).toContain("68 cartons of 2 should be 136 units, but the PO says 135");
  });

  it("explains a wrong line cost, and the total that no longer adds up", () => {
    const problems = findProblems(withFirstLine({ extCost: 6718.41 }));
    expect(problems.map((p) => p.title)).toEqual(["Line cost is wrong", "Lines don't add up to the PO total"]);
    expect(problems[0].detail).toContain("should cost $6,718.40, but the PO says $6,718.41");
    expect(problems[1].detail).toContain("off by $0.01");
  });

  it("catches cost above retail, a zero line, a repeated SKU and a ship date before the PO date", () => {
    expect(titles(withFirstLine({ cost: 200, extCost: 200 * 136 }))).toContain("Cost is at or above retail");
    expect(titles(withFirstLine({ cartons: 0, extQty: 0, extCost: 0 }))).toContain("A line orders nothing");
    expect(titles({ ...sample, lines: [...sample.lines, first] })).toContain("Same item on more than one line");
    expect(titles({ ...sample, shipDate: "2026-01-01" })).toContain("Ships before it was ordered");
  });

  it("turns problems into a correction note the vendor can act on", () => {
    const reason = problemsAsReason(findProblems(withFirstLine({ extCost: 6718.41 })));
    expect(reason).toMatch(/^Line cost is wrong: SKU 71097188/);
    expect(reason.length).toBeLessThanOrEqual(500);
  });
});

describe("checkSummary", () => {
  it("lists every rule, with the failing ones counted", () => {
    const summary = checkSummary(findProblems(withFirstLine({ extCost: 6718.41 })));
    expect(summary).toHaveLength(checkRules.length);
    expect(summary.filter((r) => r.failures > 0).map((r) => r.title)).toEqual([
      "Line cost is wrong",
      "Lines don't add up to the PO total",
    ]);
  });

  it("has a rule for every problem title findProblems can produce", () => {
    const titles = new Set(checkRules.map((r) => r.title));
    const produced = [
      ...findProblems(withFirstLine({ extQty: 1, extCost: 0, cost: 999 })),
      ...findProblems({ ...sample, shipDate: "2026-01-01", lines: [...sample.lines, first] }),
    ].map((p) => p.title);
    for (const t of produced) expect(titles.has(t), t).toBe(true);
  });
});
