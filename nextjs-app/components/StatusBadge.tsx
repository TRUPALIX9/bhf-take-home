import type { ReviewStatus } from "@/lib/types";

const styles: Record<ReviewStatus, { label: string; className: string }> = {
  pending: { label: "Pending review", className: "bg-pending-bg text-pending" },
  approved: { label: "Approved", className: "bg-approved-bg text-approved" },
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  const { label, className } = styles[status];
  return (
    <span
      data-testid="status"
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
