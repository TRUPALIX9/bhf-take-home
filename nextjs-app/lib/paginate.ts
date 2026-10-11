/**
 * Server-side pagination for the PO list (?page=2&per=10). Pure functions.
 * The server filters and sorts everything, then sends only the rows of the requested page;
 * with a database this becomes LIMIT/OFFSET (or a cursor) in the one query.
 */

export const perPageOptions = [10, 25, 50] as const;
export const defaultPerPage = 10;

/** Reads ?page and ?per. Junk, zero or negatives fall back to page 1 and the default size. */
export function parsePaging(page?: string, per?: string): { page: number; per: number } {
  const p = Number.parseInt(page ?? "", 10);
  const n = Number.parseInt(per ?? "", 10);
  return {
    page: Number.isInteger(p) && p > 0 ? p : 1,
    // Any whole number from 1 to 100 is accepted, so a link can ask for a small page.
    per: Number.isInteger(n) && n > 0 && n <= 100 ? n : defaultPerPage,
  };
}

/** The rows for one page, plus what the pager needs. A page past the end shows the last page. */
export function paginate<T>(items: T[], page: number, per: number) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / per));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * per;
  return {
    items: items.slice(start, start + per),
    page: current,
    pageCount,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + per, total),
  };
}
