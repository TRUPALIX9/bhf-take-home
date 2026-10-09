"use server";

import { revalidatePath } from "next/cache";
import { appErrors, type AppError } from "@/lib/errors";
import { orderExists, toggleStatus } from "@/lib/orders";

export type ToggleState = { error?: AppError };

/** Approves a pending PO, or moves an approved one back to review. */
export async function toggleReviewStatus(
  _prev: ToggleState,
  formData: FormData,
): Promise<ToggleState> {
  const poNumber = String(formData.get("poNumber") ?? "");
  if (!orderExists(poNumber)) return { error: appErrors.poNotFound };

  try {
    await toggleStatus(poNumber);
  } catch (err) {
    console.error(`[${appErrors.statusNotSaved.code}] PO ${poNumber}`, err);
    return { error: appErrors.statusNotSaved };
  }

  revalidatePath("/");
  revalidatePath(`/orders/${poNumber}`);
  return {};
}
