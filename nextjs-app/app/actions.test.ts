/**
 * Unit tests for the server action in app/actions.ts.
 * Run: npm test (Vitest). The browser can send anything in a form post, so these
 * send malformed and hostile input and check the action answers with an error code
 * instead of crashing or changing data.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// "server-only" throws outside a Next.js server build, and revalidatePath needs a
// running Next.js server, so both are replaced with stubs.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { setReviewStatus } = await import("@/app/actions");
const { getOrder, resetStatuses } = await import("@/lib/orders");
const { revalidatePath } = await import("next/cache");

/** Builds the form data the review button would post. */
function form(fields: Record<string, string | Blob>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

beforeEach(() => {
  resetStatuses();
  vi.mocked(revalidatePath).mockClear();
});

describe("setReviewStatus", () => {
  it("approves a PO and refreshes both pages", async () => {
    expect(await setReviewStatus({}, form({ poNumber: "TX9K2QP", status: "approved" }))).toEqual({});
    expect((await getOrder("TX9K2QP"))?.status).toBe("approved");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/orders/TX9K2QP");
  });

  it("sends a PO back with a note, and a corrected PO clears it", async () => {
    await setReviewStatus({}, form({ poNumber: "TX9K2QP", status: "needs_correction", reason: "  Wrong ship date " }));
    expect(await getOrder("TX9K2QP")).toMatchObject({ status: "needs_correction", correctionNote: "Wrong ship date" });
    await setReviewStatus({}, form({ poNumber: "TX9K2QP", status: "pending" }));
    expect(await getOrder("TX9K2QP")).toMatchObject({ status: "pending", correctionNote: undefined });
  });

  // --- malformed input: each one gets an error code and changes nothing ---
  it.each([
    ["no fields at all", {}, "PO-404"],
    ["unknown PO", { poNumber: "NOPE", status: "approved" }, "PO-404"],
    ["PO number with a path in it", { poNumber: "../../etc/passwd", status: "approved" }, "PO-404"],
    ["a file instead of a PO number", { poNumber: new Blob(["x"]), status: "approved" }, "PO-404"],
    ["missing status", { poNumber: "TX9K2QP" }, "PO-400"],
    ["status that doesn't exist", { poNumber: "TX9K2QP", status: "cancelled" }, "PO-400"],
    ["correction without a note", { poNumber: "TX9K2QP", status: "needs_correction" }, "PO-422"],
    ["correction note of only spaces", { poNumber: "TX9K2QP", status: "needs_correction", reason: "   " }, "PO-422"],
    ["correction note of 501 characters", { poNumber: "TX9K2QP", status: "needs_correction", reason: "x".repeat(501) }, "PO-422"],
    ["status in the wrong case", { poNumber: "TX9K2QP", status: "APPROVED" }, "PO-400"],
    ["script in the status", { poNumber: "TX9K2QP", status: "<script>alert(1)</script>" }, "PO-400"],
  ])("rejects %s", async (_label, fields, code) => {
    const result = await setReviewStatus({}, form(fields as Record<string, string | Blob>));
    expect(result.error?.code).toBe(code);
    expect((await getOrder("TX9K2QP"))?.status).toBe("pending"); // unchanged
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
