import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderDetail } from "@/components/OrderDetail";
import { OrderDetailSkeleton } from "@/components/Skeletons";
import { orderExists } from "@/lib/orders";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ poNumber: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { poNumber } = await params;
  return { title: `PO ${poNumber}` };
}

export default async function OrderPage({ params }: Props) {
  const { poNumber } = await params;
  // Check before anything streams, so an unknown PO gets a real 404 status.
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
      <Suspense fallback={<OrderDetailSkeleton />}>
        <OrderDetail poNumber={poNumber} />
      </Suspense>
    </div>
  );
}
