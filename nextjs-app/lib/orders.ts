/**
 * Data access layer for purchase orders. Server only.
 * Pages, Server Components and app/actions.ts read and write orders through here;
 * the order data comes from data/orders.json.
 */
// Build fails if a Client Component imports this file, so it never ships to the browser.
import "server-only";
import { cache } from "react";
import seed from "@/data/orders.json";
import type { Order, ReviewStatus } from "@/lib/types";

// --- Store ---
const orders = seed as Order[];

// Review status is kept in memory, seeded from the JSON file. It is stored on
// globalThis so it survives hot reloads in dev. It resets when the server
// restarts; a database would replace this Map and nothing else.
const store = globalThis as typeof globalThis & {
  reviewStatus?: Map<string, ReviewStatus>;
};

// Builds the Map on first use (??= only assigns when it is still undefined).
function statuses(): Map<string, ReviewStatus> {
  store.reviewStatus ??= new Map(orders.map((o) => [o.poNumber, o.status]));
  return store.reviewStatus;
}

// Returns a copy with the live status, so the seed data is never mutated.
function withCurrentStatus(order: Order): Order {
  return { ...order, status: statuses().get(order.poNumber) ?? order.status };
}

// --- Simulated latency ---
// The functions below are async, like real database calls would be.
// Set SIMULATED_LATENCY_MS (e.g. `npm run dev:slow`) to see loading states.
const latency = Number(process.env.SIMULATED_LATENCY_MS ?? 0);
const wait = () => (latency > 0 ? new Promise((r) => setTimeout(r, latency)) : Promise.resolve());

// --- Reads ---
/**
 * All orders, earliest ship date first. Wrapped in React's cache() so the
 * summary and the table share one read per request instead of two.
 */
export const getOrders = cache(async (): Promise<Order[]> => {
  await wait();
  // ISO dates sort correctly as plain strings.
  return orders
    .map(withCurrentStatus)
    .sort((a, b) => a.shipDate.localeCompare(b.shipDate));
});

/** One order with its current status, or undefined if the PO number is unknown. */
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

// --- Writes ---
/** True for the two values a review status can take. Used to check form input. */
export function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === "pending" || value === "approved";
}

/**
 * Sets an order's review status to the given value.
 * It sets rather than flips, so it is idempotent: sending "approved" twice leaves the
 * PO approved. A flip would undo the first click if a second tab or a second reviewer
 * clicked from a page that was out of date.
 */
export async function setStatus(poNumber: string, status: ReviewStatus): Promise<ReviewStatus> {
  await wait();
  if (!statuses().has(poNumber)) throw new Error(`Unknown PO ${poNumber}`);
  statuses().set(poNumber, status);
  return status;
}

/** Puts every order back to its seed status. Used by tests. */
export function resetStatuses(): void {
  // statuses() rebuilds the Map from the seed on its next call.
  store.reviewStatus = undefined;
}
