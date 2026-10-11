"use client";

/**
 * Status filter in the PO list toolbar, as a button that reads like a sentence
 * ("Status: Pending review 3 ▾") and opens a short menu. Each choice shows its colored dot (the
 * same colors as the badges) and how many POs it would show. Status lives in the
 * URL (?status=pending) like every other filter. Client Component: it opens the menu and pushes
 * the new URL, keeping the search, the Filters panel and the sort.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { filtersFromSearchParams } from "@/lib/filters";
import { listHref, parseSort } from "@/lib/sort";

type Key = "all" | "pending" | "approved" | "needs_correction";
type Counts = Record<Key, number>;

// Label and dot color (the same tokens as the status badges).
const choices: { key: Key; label: string; dot: string }[] = [
  { key: "all", label: "All", dot: "bg-line-strong" },
  { key: "pending", label: "Pending review", dot: "bg-pending" },
  { key: "approved", label: "Approved", dot: "bg-approved" },
  { key: "needs_correction", label: "Needs correction", dot: "bg-danger" },
];

/** Status filter: a button and its menu. */
export function StatusSelect({ counts }: { counts: Counts }) {
  const params = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { q, status, country, vendor, master } = filtersFromSearchParams(params);
  const sort = parseSort(params.get("sort") ?? undefined, params.get("dir") ?? undefined);
  const current = choices.find((c) => c.key === (status ?? "all"))!;

  function choose(key: Key) {
    setOpen(false);
    // A transition keeps the current table on screen until the new one arrives.
    startTransition(() =>
      router.push(listHref({ q, status: key === "all" ? undefined : key, country, vendor, master }, sort), {
        scroll: false,
      }),
    );
  }

  // Close on Escape or a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Status: ${current.label}`}
        className={`inline-flex min-h-9 items-center gap-2 rounded-md border bg-surface px-3 text-sm ${
          open ? "border-accent ring-2 ring-accent/30" : "border-line-strong hover:border-accent/50"
        }`}
      >
        <span className="text-muted">Status:</span>
        <span aria-hidden className={`size-2 rounded-full ${current.dot}`} />
        <span className="font-medium">{current.label}</span>
        <span className="num rounded-full bg-subtle px-1.5 text-xs text-muted">{counts[current.key]}</span>
        {isPending ? <Spinner className="size-3.5 text-accent" /> : <span aria-hidden className="text-xs text-muted">▾</span>}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Filter by status"
          className="absolute top-full left-0 z-30 mt-2 flex w-60 max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-line bg-surface p-1.5 shadow-lg motion-safe:animate-appear"
        >
          {choices.map((c) => {
            const selected = c.key === current.key;
            return (
              <button
                key={c.key}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => choose(c.key)}
                className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-left ${selected ? "bg-accent-soft" : "hover:bg-subtle"}`}
              >
                <span aria-hidden className={`size-2 shrink-0 rounded-full ${c.dot}`} />
                <span className={`flex-1 text-sm ${selected ? "font-semibold text-accent" : "font-medium"}`}>{c.label}</span>
                <span className="num text-xs text-muted">{counts[c.key]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
