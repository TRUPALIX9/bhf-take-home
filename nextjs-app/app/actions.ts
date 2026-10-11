"use server";

/**
 * Server Actions: functions the browser can call that run only on the server.
 * ReviewPanel (client) calls setReviewStatus through useActionState; it writes via lib/orders.ts.
 */
import { revalidatePath } from "next/cache";
import { appErrors, type AppError } from "@/lib/errors";
import { isReviewStatus, orderExists, setStatus } from "@/lib/orders";

/** Result sent back to the form: empty on success, or the error to show. */
export type ReviewActionState = { error?: AppError };

/**
 * Sets a PO's review status to the value the button asked for ("approved" or "pending").
 * Setting a target value, not flipping, makes repeat and stale clicks safe.
 */
export async function setReviewStatus(
  // (prevState, formData) is the signature useActionState expects; the previous state isn't needed here.
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  // Form data comes from the client, so both fields are checked before they are trusted.
  const poNumber = String(formData.get("poNumber") ?? "");
  const status = formData.get("status");
  if (!orderExists(poNumber)) return { error: appErrors.poNotFound };
  if (!isReviewStatus(status)) return { error: appErrors.invalidStatus };

  try {
    await setStatus(poNumber, status);
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
