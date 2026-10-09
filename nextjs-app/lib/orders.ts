import "server-only";
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

/** All orders, earliest ship date first. */
export function getOrders(): Order[] {
  return orders
    .map(withCurrentStatus)
    .sort((a, b) => a.shipDate.localeCompare(b.shipDate));
}

export function getOrder(poNumber: string): Order | undefined {
  const order = orders.find((o) => o.poNumber === poNumber);
  return order && withCurrentStatus(order);
}

/** Flips an order between pending and approved and returns the new status. */
export function toggleStatus(poNumber: string): ReviewStatus {
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
