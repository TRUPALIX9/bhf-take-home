/**
 * Unit tests for lib/origin.ts. Run: npm test (Vitest).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getOrder } = await import("@/lib/orders");
const { originOf } = await import("@/lib/origin");

describe("origin", () => {
  it("reads port and country from the ship terms", async () => {
    expect(originOf((await getOrder("TX9K2QP"))!)).toEqual({ port: "Ningbo", country: "CHN" });
  });
});
