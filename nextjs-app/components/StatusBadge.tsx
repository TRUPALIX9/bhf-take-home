import { Badge } from "@/components/ui/Badge";
import type { ReviewStatus } from "@/lib/types";

const labels: Record<ReviewStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <Badge tone={status} testId="status">
      {labels[status]}
    </Badge>
  );
}
