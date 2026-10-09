"use server";

import { revalidatePath } from "next/cache";
import { getOrder, toggleStatus } from "@/lib/orders";
import type { ReviewStatus } from "@/lib/types";

export type ToggleState = { status: ReviewStatus; error?: string };

/** Approves a pending PO, or moves an approved one back to review. */
export async function toggleReviewStatus(
  prev: ToggleState,
  formData: FormData,
): Promise<ToggleState> {
  const poNumber = String(formData.get("poNumber") ?? "");
  if (!getOrder(poNumber)) {
    return { ...prev, error: `PO ${poNumber || "(blank)"} was not found.` };
  }

  const status = toggleStatus(poNumber);
  revalidatePath("/");
  revalidatePath(`/orders/${poNumber}`);
  return { status };
}
