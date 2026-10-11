"use client";

/**
 * Status filter tabs above the PO table (rendered by OrdersToolbar).
 * Client Component: it reads the URL and handles clicks. The clicked tab highlights
 * at once (useOptimistic) and only the table below reloads.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { filtersFromSearchParams } from "@/lib/filters";
import { reviewStatuses } from "@/lib/types";
import { listHref, parseSort } from "@/lib/sort";

// --- Tab definitions ---
// `as const` keeps each status as its literal type, e.g. "pending".
const tabs = [
  { label: "All", status: undefined },
  { label: "Pending review", status: "pending" },
  { label: "Approved", status: "approved" },
  { label: "Needs correction", status: "needs_correction" },
] as const;

type Counts = { all: number; pending: number; approved: number; needs_correction: number };

/**
 * Filter links for the list. The filter lives in the URL (?status=pending).
 * The clicked tab highlights at once and shows a small spinner until the
 * server sends the new table; nothing else on the page reloads.
 */
export function StatusTabs({ counts }: { counts: Counts }) {
  // --- URL and optimistic state ---
  // Unknown values (?status=foo) show the full list, so treat them as "All".
  const params = useSearchParams();
  const param = params.get("status");
  // Switching tabs keeps the current sort and the Filters-menu filters.
  const sort = parseSort(params.get("sort") ?? undefined, params.get("dir") ?? undefined);
  const { country, vendor, master } = filtersFromSearchParams(params); // facets, kept across tabs
  const menuFilters = { country, vendor, master };
  const current = reviewStatuses.find((s) => s === param);
  // `active` follows the URL, but can be set ahead of it during a transition.
  const [active, setActive] = useOptimistic(current);
  // isPending is true until the new server render for the pushed URL has arrived.
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // --- Render ---
  // Real <Link>s, so tabs work without JS and can be opened in a new tab.
  return (
    // Scrolls sideways on a narrow phone, with the scroll bar hidden (the tabs fit on wider screens).
    <nav
      aria-label="Filter by status"
      className="flex gap-0.5 overflow-x-auto overflow-y-hidden px-2 [scrollbar-width:none] sm:gap-1 [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const isActive = tab.status === active;
        const count = counts[tab.status ?? "all"];
        const href = listHref({ ...menuFilters, status: tab.status }, sort);
        return (
          <Link
            key={tab.label}
            href={href}
            scroll={false} // keep the scroll position when switching tabs
            onClick={(e) => {
              // Let cmd/ctrl/shift/middle clicks open a new tab as usual.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              // One transition covers the highlight and the navigation, so the
              // highlight stays until the new table has arrived.
              startTransition(() => {
                setActive(tab.status);
                router.push(href, { scroll: false });
              });
            }}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-2 font-medium whitespace-nowrap sm:px-3 transition-colors ${
              isActive ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab.label}
            {isActive && isPending && <Spinner className="size-3.5 text-accent" />}
            <Badge tone={isActive ? "accent" : "neutral"} dot={false}>
              {count}
            </Badge>
          </Link>
        );
      })}
    </nav>
  );
}
