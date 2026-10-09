import Link from "next/link";
import { linkClass } from "@/components/ui/Button";
import { appErrors } from "@/lib/errors";

export default function OrderNotFound() {
  const { code, title, message } = appErrors.poNotFound;
  return (
    <div className="flex flex-col items-start gap-2 py-10">
      <p className="font-mono text-xs text-muted">Error {code}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted">{message}</p>
      <Link href="/" className={`mt-2 ${linkClass}`}>
        Back to purchase orders
      </Link>
    </div>
  );
}
