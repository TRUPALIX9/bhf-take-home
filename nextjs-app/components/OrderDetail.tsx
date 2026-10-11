/**
 * Body of the PO detail page (app/orders/[poNumber]/page.tsx). Async Server Component:
 * it awaits the order on the server and ships no JS of its own. Only ReviewPanel,
 * which holds the button, is a Client Component.
 *
 * Two layers, top to bottom:
 *   1. The review: PO number, status, Approve button, step tracker, then the pass/fail checks.
 *   2. The record: the purchase order laid out like the printed document.
 */

import { notFound } from "next/navigation";
import { PurchaseOrderDocument } from "@/components/PurchaseOrderDocument";
import { ReviewChecks } from "@/components/ReviewChecks";
import { ReviewPanel } from "@/components/ReviewPanel";
import { reviewChecks } from "@/lib/checks";
import { formatDate, formatMoney, titleCase, vendorName } from "@/lib/format";
import { getOrder } from "@/lib/orders";

/** Everything on the PO page below the breadcrumb. Streams in behind OrderDetailSkeleton. */
export async function OrderDetail({ poNumber }: { poNumber: string }) {
  // --- Data ---
  const order = await getOrder(poNumber);
  // The page already returned a real 404 via orderExists(); this only guards the type.
  if (!order) notFound();

  const checks = reviewChecks(order);
  const allPass = checks.every((c) => c.ok);

  // --- Render ---
  return (
    <div className="flex flex-col gap-6 motion-safe:animate-fade-in">
      {/* 1. The review: title, status, button and step tracker (client side) */}
      <ReviewPanel
        poNumber={order.poNumber}
        status={order.status}
        subtitle={`${titleCase(vendorName(order))} · ${formatMoney(order.totalCost)} · ships ${formatDate(order.shipDate)}`}
        poDate={formatDate(order.poDate)}
        lineCount={order.lines.length}
        totalsMatch={allPass}
      />
      <ReviewChecks checks={checks} />

      {/* 2. The record: the PO as a document */}
      <PurchaseOrderDocument order={order} />
    </div>
  );
}
