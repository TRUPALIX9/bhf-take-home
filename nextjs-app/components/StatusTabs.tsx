"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

const tabs = [
  { label: "All", status: undefined },
  { label: "Pending review", status: "pending" },
  { label: "Approved", status: "approved" },
] as const;

type Counts = { all: number; pending: number; approved: number };

/**
 * Filter links for the list. The filter lives in the URL (?status=pending).
 * The clicked tab highlights at once and shows a small spinner until the
 * server sends the new table; nothing else on the page reloads.
 */
export function StatusTabs({ counts }: { counts: Counts }) {
  const current = useSearchParams().get("status") ?? undefined;
  const [active, setActive] = useOptimistic(current);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <nav aria-label="Filter by status" className="flex gap-1 border-b border-line">
      {tabs.map((tab) => {
        const isActive = tab.status === active;
        const count = counts[tab.status ?? "all"];
        const href = tab.status ? `/?status=${tab.status}` : "/";
        return (
          <Link
            key={tab.label}
            href={href}
            scroll={false}
            onClick={(e) => {
              e.preventDefault();
              // One transition covers the highlight and the navigation, so the
              // highlight stays until the new table has arrived.
              startTransition(() => {
                setActive(tab.status);
                router.push(href, { scroll: false });
              });
            }}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 font-medium ${
              isActive ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab.label}
            {isActive && isPending ? (
              <span
                aria-label="Loading"
                className="size-3.5 rounded-full border-2 border-accent border-r-transparent motion-safe:animate-spin"
              />
            ) : null}
            <span
              className={`num rounded-full px-2 py-0.5 text-xs ${
                isActive ? "bg-accent-soft text-accent" : "bg-subtle text-muted"
              }`}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
