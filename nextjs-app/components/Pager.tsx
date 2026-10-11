/**
 * Pager under the PO table: "1–10 of 47", Previous / page numbers / Next, and rows per page.
 * Server Component: every control is a plain link to the same list with ?page= and ?per=, so
 * paging works without JavaScript and every page is a shareable URL.
 */

import Link from "next/link";
import { perPageOptions } from "@/lib/paginate";

type Page = { page: number; pageCount: number; total: number; from: number; to: number };

/** Pager links. `hrefFor(page, per)` builds the URL with the current filters and sort kept. */
export function Pager({ page, per, hrefFor }: { page: Page; per: number; hrefFor: (page: number, per: number) => string }) {
  const link = "inline-flex min-h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm";
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
      <span className="num text-muted" data-testid="page-range">
        {page.from}–{page.to} of {page.total}
      </span>

      {page.pageCount > 1 && (
        <span className="flex items-center gap-1">
          {page.page > 1 ? (
            <Link href={hrefFor(page.page - 1, per)} scroll={false} className={`${link} hover:bg-subtle`}>
              ‹ Previous
            </Link>
          ) : (
            <span className={`${link} text-muted`} aria-disabled>‹ Previous</span>
          )}
          {Array.from({ length: page.pageCount }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={hrefFor(n, per)}
              scroll={false}
              aria-current={n === page.page ? "page" : undefined}
              className={`${link} num ${n === page.page ? "bg-accent text-inverse" : "hover:bg-subtle"}`}
            >
              {n}
            </Link>
          ))}
          {page.page < page.pageCount ? (
            <Link href={hrefFor(page.page + 1, per)} scroll={false} className={`${link} hover:bg-subtle`}>
              Next ›
            </Link>
          ) : (
            <span className={`${link} text-muted`} aria-disabled>Next ›</span>
          )}
        </span>
      )}

      {/* Changing the page size goes back to page 1. */}
      <span className="flex items-center gap-1 text-muted">
        Rows per page
        {perPageOptions.map((n) => (
          <Link
            key={n}
            href={hrefFor(1, n)}
            scroll={false}
            aria-current={n === per ? "true" : undefined}
            className={`${link} num ${n === per ? "font-semibold text-ink" : "hover:bg-subtle"}`}
          >
            {n}
          </Link>
        ))}
      </span>
    </nav>
  );
}
