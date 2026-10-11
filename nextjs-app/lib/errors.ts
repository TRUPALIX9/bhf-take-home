/**
 * Every error a person can see in the app, with a short code and a plain message.
 * The code is what someone would quote to support; the message says what to do.
 * Plain data, safe on server and client: used by actions.ts, error boundaries and not-found.
 */
export const appErrors = {
  poNotFound: {
    code: "PO-404",
    title: "PO not found",
    message: "There is no purchase order with that number. Check the PO number and try again.",
  },
  orderLoadFailed: {
    code: "PO-500",
    title: "This purchase order could not load",
    message: "The rest of the app still works. Try again, or go back to the list and open a different PO.",
  },
  statusNotSaved: {
    code: "PO-501",
    title: "Status not saved",
    message: "The review status could not be saved, so nothing changed. Try again.",
  },
  pageFailed: {
    code: "APP-500",
    title: "This page could not load",
    message: "Something went wrong on our side. Try again; if it keeps failing, restart the server.",
  },
  appFailed: {
    code: "APP-503",
    title: "The app could not start",
    message: "Something failed while loading the app. Try again; if it keeps failing, restart the server.",
  },
} as const; // as const keeps the literal strings, so AppError is exact.

/** Any one entry from appErrors. */
export type AppError = (typeof appErrors)[keyof typeof appErrors];
