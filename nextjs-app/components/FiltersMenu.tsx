"use client";

/**
 * "Filters" button in the PO list toolbar. It opens a panel with one checkbox group per facet
 * (origin, vendor, master PO), each with Select all and Clear. The server sends only the
 * options that would return POs given the other filters and the status tab, with counts
 * (lib/filters.ts facetOptions), so the panel never offers a dead end. Every tick filters the
 * table at once. Active values show as chips beside the button: × removes one, Clear all
 * removes every one.
 *
 * Client Component: it keeps the ticks in local state so they change instantly, and pushes
 * the new URL in a transition; the server then renders the table, tabs and counts again.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { facets, filtersFromSearchParams, type Facet, type FacetGroup, type FacetOption } from "@/lib/filters";
import { listHref, parseSort } from "@/lib/sort";

type Selection = Record<Facet, string[]>;
const emptySelection: Selection = { country: [], vendor: [], master: [] };

/** One facet: heading, Select all / Clear, and a checkbox per available value. */
function CheckboxGroup({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: FacetOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const selectable = options.filter((o) => o.count > 0);
  const allSelected = selectable.length > 0 && selectable.every((o) => selected.includes(o.value));
  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <fieldset className="flex flex-col gap-1">
      <div className="mb-1 flex items-center justify-between">
        <legend className="text-xs font-medium tracking-wide text-muted uppercase">{title}</legend>
        <span className="flex gap-3 text-xs font-medium">
          <button
            type="button"
            onClick={() => onChange(selectable.map((o) => o.value))}
            disabled={allSelected}
            className="text-accent hover:underline disabled:text-muted disabled:no-underline"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
            className="text-accent hover:underline disabled:text-muted disabled:no-underline"
          >
            Clear
          </button>
        </span>
      </div>
      {options.length === 0 && <p className="px-2 text-sm text-muted">Nothing to filter here.</p>}
      {options.map((o) => (
        <label key={o.value} className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-subtle">
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => toggle(o.value)}
            className="size-4 accent-accent"
          />
          <span className={`flex-1 ${o.count === 0 ? "text-muted" : ""}`}>{o.label}</span>
          <span className="num text-xs text-muted">{o.count}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Filters button, its panel, and chips for the active filters. */
export function FiltersMenu({ groups }: { groups: FacetGroup[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);

  // --- Selection: the URL is the source of truth; local state makes ticks feel instant ---
  const applied = filtersFromSearchParams(params);
  const sort = parseSort(params.get("sort") ?? undefined, params.get("dir") ?? undefined);
  const urlKey = params.toString();
  const pick = (f: ReturnType<typeof filtersFromSearchParams>): Selection => ({
    country: f.country,
    vendor: f.vendor,
    master: f.master,
  });
  const [selection, setSelection] = useState<Selection>(pick(applied));
  // When the URL changes from elsewhere (a chip, a tab, the back button), follow it.
  useEffect(() => {
    setSelection(pick(filtersFromSearchParams(new URLSearchParams(urlKey))));
  }, [urlKey]);

  /** Updates the ticks at once, then loads the filtered list in a transition. */
  function apply(next: Selection) {
    setSelection(next);
    startTransition(() => router.push(listHref({ status: applied.status, ...next }, sort), { scroll: false }));
  }
  const setFacet = (facet: Facet) => (values: string[]) => apply({ ...selection, [facet]: values });

  // --- Chips: one per ticked value, labelled from the facet options ---
  const labelOf = (facet: Facet, value: string) => {
    const label = groups.find((g) => g.facet === facet)?.options.find((o) => o.value === value)?.label ?? value;
    return facet === "master" ? `Master PO ${label}` : label;
  };
  const chips = facets.flatMap((facet) =>
    selection[facet].map((value) => ({
      key: `${facet}-${value}`,
      label: labelOf(facet, value),
      remove: () => setFacet(facet)(selection[facet].filter((v) => v !== value)),
    })),
  );
  const count = chips.length;

  // Close the panel on Escape or on a click outside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !panelRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // --- Render ---
  return (
    <div ref={panelRef} className="relative flex flex-wrap items-center justify-end gap-2">
      {/* Active filters as chips; × removes one, Clear all removes every one. */}
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex min-h-8 items-center gap-1 rounded-full bg-accent-soft py-0.5 pr-1 pl-3 text-sm font-medium text-accent motion-safe:animate-fade-in"
        >
          {c.label}
          <button
            type="button"
            onClick={c.remove}
            aria-label={`Remove filter ${c.label}`}
            className="grid size-6 place-items-center rounded-full hover:bg-accent/15"
          >
            ×
          </button>
        </span>
      ))}
      {count > 1 && (
        <button type="button" onClick={() => apply(emptySelection)} className="text-sm font-medium text-muted hover:text-ink">
          Clear all
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        // Blue so it reads as a control: tinted when no filters are on, solid when some are.
        className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${
          count
            ? "border-accent bg-accent text-inverse hover:bg-accent-dark"
            : "border-accent/30 bg-accent-soft text-accent hover:border-accent/60"
        } ${open ? "ring-2 ring-accent/30" : ""}`}
      >
        <Icon name="filter" className="size-4" />
        Filters
        {count > 0 && (
          <span className="num grid size-5 place-items-center rounded-full bg-surface text-xs text-accent">{count}</span>
        )}
        {isPending && <Spinner className="size-3.5" />}
      </button>

      {/* The panel: one checkbox group per facet. Each tick applies at once. */}
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Filter purchase orders"
          className="absolute top-full right-0 z-30 mt-2 flex max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] flex-col gap-4 overflow-y-auto rounded-xl border border-line bg-surface p-4 shadow-lg motion-safe:animate-fade-in"
        >
          {groups.map((g) => (
            <CheckboxGroup
              key={g.facet}
              title={g.title}
              options={g.options}
              selected={selection[g.facet]}
              onChange={setFacet(g.facet)}
            />
          ))}
          <div className="flex items-center justify-between border-t border-line pt-3">
            <button
              type="button"
              onClick={() => apply(emptySelection)}
              disabled={count === 0}
              className="text-sm font-medium text-accent disabled:text-muted"
            >
              Clear all filters
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-inverse hover:bg-accent-dark"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
