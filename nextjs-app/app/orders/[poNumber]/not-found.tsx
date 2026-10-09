import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="label">404</span>
      <h1 className="font-display text-4xl font-semibold">PO not found</h1>
      <p className="text-muted">There is no purchase order with that number. Check the PO # and try again.</p>
      <Link href="/" className="text-accent underline-offset-4 hover:underline">
        ← All purchase orders
      </Link>
    </div>
  );
}
