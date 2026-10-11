/**
 * PO detail route: /orders/[poNumber]. Server Component.
 * Returns a real 404 for unknown POs before streaming, then streams OrderDetail behind a skeleton.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderDetail } from "@/components/OrderDetail";
import { OrderDetailSkeleton } from "@/components/Skeletons";
import { orderExists } from "@/lib/orders";

// Status can change at any time, so never prerender this page.
export const dynamic = "force-dynamic";

// params is a Promise in Next 15, so await it before reading poNumber.
type Props = { params: Promise<{ poNumber: string }> };

/** Browser tab title, e.g. "PO TX9K2QP · PO Review" (suffix from the layout template). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { poNumber } = await params;
  return { title: `PO ${poNumber}` };
}

/** Breadcrumb plus the streamed order detail for one PO. */
export default async function OrderPage({ params }: Props) {
  const { poNumber } = await params;
  // Check before anything streams, so an unknown PO gets a real 404 status.
  // notFound() throws and renders the sibling not-found.tsx.
  if (!orderExists(poNumber)) notFound();

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Breadcrumb" className="text-muted">
        <Link href="/" className="hover:text-ink hover:underline">
          Purchase orders
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink">{poNumber}</span>
      </nav>
      {/* The breadcrumb shows at once; the order data streams in when ready. */}
      <Suspense fallback={<OrderDetailSkeleton />}>
        <OrderDetail poNumber={poNumber} />
      </Suspense>
    </div>
  );
}
