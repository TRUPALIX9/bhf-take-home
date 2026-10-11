/**
 * 404 page for /orders/[poNumber]. Server Component.
 * Rendered when page.tsx calls notFound(); the response keeps its 404 status.
 * Amber, not red: a wrong PO number is usually a typo or an old link, not a failure.
 */
import Link from "next/link";
import { ErrorCard } from "@/components/ErrorCard";
import { buttonClass } from "@/components/ui/Button";
import { appErrors } from "@/lib/errors";

/** "PO not found" card with the PO-404 code and a way back to the list. */
export default function OrderNotFound() {
  return (
    <ErrorCard appError={appErrors.poNotFound} icon="search" tone="pending">
      <Link href="/" className={buttonClass("primary")}>
        Back to purchase orders
      </Link>
    </ErrorCard>
  );
}
