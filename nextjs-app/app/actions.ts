"use server";

import { revalidatePath } from "next/cache";
import { getOrder, toggleStatus } from "@/lib/orders";

export type ToggleState = { error?: string };

/** Approves a pending PO, or moves an approved one back to review. */
export async function toggleReviewStatus(
  _prev: ToggleState,
  formData: FormData,
): Promise<ToggleState> {
  const poNumber = String(formData.get("poNumber") ?? "");
  if (!getOrder(poNumber)) {
    return { error: `PO ${poNumber || "(blank)"} was not found.` };
  }

  toggleStatus(poNumber);
  revalidatePath("/");
  revalidatePath(`/orders/${poNumber}`);
  return {};
}
