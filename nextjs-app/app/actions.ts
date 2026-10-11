"use server";

/**
 * Server Actions: functions the browser can call that run only on the server.
 * ReviewPanel (client) calls toggleReviewStatus through useActionState; it writes via lib/orders.ts.
 */
import { revalidatePath } from "next/cache";
import { appErrors, type AppError } from "@/lib/errors";
import { orderExists, toggleStatus } from "@/lib/orders";

/** Result sent back to the form: empty on success, or the error to show. */
export type ToggleState = { error?: AppError };

/** Approves a pending PO, or moves an approved one back to review. */
export async function toggleReviewStatus(
  // (prevState, formData) is the signature useActionState expects; the previous state isn't needed here.
  _prev: ToggleState,
  formData: FormData,
): Promise<ToggleState> {
  // Form data comes from the client, so it is checked before it is trusted.
  const poNumber = String(formData.get("poNumber") ?? "");
  if (!orderExists(poNumber)) return { error: appErrors.poNotFound };

  try {
    await toggleStatus(poNumber);
  } catch (err) {
    // Full error goes to the server log; the user gets a short code and a plain message.
    console.error(`[${appErrors.statusNotSaved.code}] PO ${poNumber}`, err);
    return { error: appErrors.statusNotSaved };
  }

  // Drop the cached render of both pages that show this status, so the next view is fresh.
  revalidatePath("/");
  revalidatePath(`/orders/${poNumber}`);
  return {};
}
