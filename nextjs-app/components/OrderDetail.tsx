/**
 * Body of the PO detail page (app/orders/[poNumber]/page.tsx). Async Server Component:
 * it awaits the order on the server and ships no JS of its own. Only ReviewPanel,
 * which holds the button, is a Client Component.
 *
 * Two layers, top to bottom:
 *   1. The review, in one compact card: PO number, status, Approve button, then one row
 *      with the step tracker and a checks chip that expands to the three checks.
 *   2. The record: the purchase order laid out like the printed document.
 */

import { notFound } from "next/navigation";
import { PurchaseOrderDocument } from "@/components/PurchaseOrderDocument";
import { ChecksInfo } from "@/components/ChecksInfo";
import { ReviewChecks } from "@/components/ReviewChecks";
import { ReviewPanel } from "@/components/ReviewPanel";
import { findProblems, problemsAsReason } from "@/lib/checks";
import type { LineSort } from "@/lib/lineSort";
import { formatDate, formatMoney, titleCase, vendorName } from "@/lib/format";
import { getOrder, getOrders } from "@/lib/orders";

/** Everything on the PO page below the breadcrumb. Streams in behind OrderDetailSkeleton. */
export async function OrderDetail({ poNumber, lineSort }: { poNumber: string; lineSort: LineSort }) {
  // --- Data ---
  const order = await getOrder(poNumber);
  // The page already returned a real 404 via orderExists(); this only guards the type.
  if (!order) notFound();

  const problems = findProblems(order);
  // How many POs share this PO's master PO, for the link on the document.
  const masterCount = (await getOrders()).filter((o) => o.refMasterPo === order.refMasterPo).length;

  // --- Render ---
  return (
    <div className="flex flex-col gap-6 motion-safe:animate-fade-in">
      {/* 1. The review: title, status, button and step tracker (client side) */}
      <ReviewPanel
        poNumber={order.poNumber}
        status={order.status}
        subtitle={`${titleCase(vendorName(order))} · ${formatMoney(order.totalCost)} · ships ${formatDate(order.shipDate)}`}
        correctionNote={order.correctionNote}
        info={<ChecksInfo problems={problems} />}
        hasProblems={problems.length > 0}
        problems={<ReviewChecks problems={problems} />}
        suggestedNote={problems.length ? problemsAsReason(problems) : undefined}
      />

      {/* 2. The record: the PO as a document */}
      <PurchaseOrderDocument order={order} masterCount={masterCount} lineSort={lineSort} />
    </div>
  );
}
