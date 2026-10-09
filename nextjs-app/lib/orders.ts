import "server-only";
import { cache } from "react";
import seed from "@/data/orders.json";
import type { Order, ReviewStatus } from "@/lib/types";

const orders = seed as Order[];

// Review status is kept in memory, seeded from the JSON file. It is stored on
// globalThis so it survives hot reloads in dev. It resets when the server
// restarts; a database would replace this Map and nothing else.
const store = globalThis as typeof globalThis & {
  reviewStatus?: Map<string, ReviewStatus>;
};

function statuses(): Map<string, ReviewStatus> {
  store.reviewStatus ??= new Map(orders.map((o) => [o.poNumber, o.status]));
  return store.reviewStatus;
}

function withCurrentStatus(order: Order): Order {
  return { ...order, status: statuses().get(order.poNumber) ?? order.status };
}

// The functions below are async, like real database calls would be.
// Set SIMULATED_LATENCY_MS (e.g. `npm run dev:slow`) to see loading states.
const latency = Number(process.env.SIMULATED_LATENCY_MS ?? 0);
const wait = () => (latency > 0 ? new Promise((r) => setTimeout(r, latency)) : Promise.resolve());

/**
 * All orders, earliest ship date first. Wrapped in React's cache() so the
 * summary and the table share one read per request instead of two.
 */
export const getOrders = cache(async (): Promise<Order[]> => {
  await wait();
  return orders
    .map(withCurrentStatus)
    .sort((a, b) => a.shipDate.localeCompare(b.shipDate));
});

export async function getOrder(poNumber: string): Promise<Order | undefined> {
  await wait();
  // Test hook: the e2e suite sets FAIL_PO to prove the error boundary works. Unset in normal use.
  if (process.env.FAIL_PO === poNumber) throw new Error(`Simulated failure loading ${poNumber}`);
  const order = orders.find((o) => o.poNumber === poNumber);
  return order && withCurrentStatus(order);
}

/** Instant check, used before streaming starts so unknown POs get a real 404. */
export function orderExists(poNumber: string): boolean {
  return orders.some((o) => o.poNumber === poNumber);
}

/** Flips an order between pending and approved and returns the new status. */
export async function toggleStatus(poNumber: string): Promise<ReviewStatus> {
  await wait();
  const current = statuses().get(poNumber);
  if (!current) throw new Error(`Unknown PO ${poNumber}`);
  const next: ReviewStatus = current === "pending" ? "approved" : "pending";
  statuses().set(poNumber, next);
  return next;
}

/** Puts every order back to its seed status. Used by tests. */
export function resetStatuses(): void {
  store.reviewStatus = undefined;
}
