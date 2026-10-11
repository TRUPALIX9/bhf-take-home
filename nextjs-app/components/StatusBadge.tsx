/**
 * Pending / Approved badge for a PO, used in the list and the detail title bar.
 * No hooks, so it renders on the server or inside a client parent such as ReviewPanel.
 */

import { Badge } from "@/components/ui/Badge";
import type { ReviewStatus } from "@/lib/types";

const labels: Record<ReviewStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  needs_correction: "Needs correction",
};

/** Maps a review status to its label and color. The status name doubles as the Badge tone. */
export function StatusBadge({ status, trailing }: { status: ReviewStatus; trailing?: React.ReactNode }) {
  return (
    <Badge tone={status} testId="status" trailing={trailing}>
      {labels[status]}
    </Badge>
  );
}
