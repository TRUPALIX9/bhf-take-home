"use client";

/**
 * "Filters" button in the PO list toolbar. It opens a panel with a checkbox group per
 * filter type (origin country, vendor). Pick any number in each group, then Apply: inside
 * a group a PO matches any ticked value, across groups it must match each group
 * (see lib/filters.ts). Active values show as chips beside the button; × removes one.
 *
 * Client Component: it holds the panel's open state and the ticks until Apply, then
 * pushes the new URL. The server renders the filtered table. Status and sort are kept.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { activeMenuFilters, filtersFromSearchParams } from "@/lib/filters";
import { listHref, parseSort } from "@/lib/sort";

type Option = { value: string; label: string; count: number };
type Group = "country" | "vendor" | "master";

/** One group of checkboxes with a heading, e.g. "Origin". */
function CheckboxGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">{title}</legend>
      {options.map((o) => (
        <label key={o.value} className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-subtle">
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => onToggle(o.value)}
            className="size-4 accent-accent"
          />
          <span className="flex-1">{o.label}</span>
          <span className="num text-xs text-muted">{o.count}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Filters button, its panel, and chips for the active filters. */
export function FiltersMenu({ countries, vendors }: { countries: Option[]; vendors: Option[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // --- Applied filters (from the URL) and the draft being edited in the panel ---
  const applied = filtersFromSearchParams(params);
  const sort = parseSort(params.get("sort") ?? undefined, params.get("dir") ?? undefined);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ country: applied.country, vendor: applied.vendor });

  const labelOf = (group: Group, value: string) =>
    group === "master"
      ? `Master PO ${value}`
      : ((group === "country" ? countries : vendors).find((o) => o.value === value)?.label ?? value);
  const chips = [
    ...applied.country.map((value) => ({ group: "country" as const, value })),
    ...applied.vendor.map((value) => ({ group: "vendor" as const, value })),
    // Set by the "Ref master PO" link on a PO page; not in the panel, only removable here.
    ...(applied.master ? [{ group: "master" as const, value: applied.master }] : []),
  ];

  /** Goes to the list with these menu filters. A transition keeps the table up until the new one arrives. */
  function go(country: string[], vendor: string[], master = applied.master) {
    startTransition(() =>
      router.push(listHref({ status: applied.status, country, vendor, master }, sort), { scroll: false }),
    );
  }

  function openPanel() {
    setDraft({ country: applied.country, vendor: applied.vendor }); // start from what is applied
    setOpen(true);
  }

  function toggle(group: "country" | "vendor", value: string) {
    setDraft((d) => ({
      ...d,
      [group]: d[group].includes(value) ? d[group].filter((v) => v !== value) : [...d[group], value],
    }));
  }

  function removeChip(group: Group, value: string) {
    if (group === "master") return go(applied.country, applied.vendor, undefined);
    const next = { country: applied.country, vendor: applied.vendor };
    next[group] = next[group].filter((v) => v !== value);
    go(next.country, next.vendor);
  }

  // Close the panel on Escape or on a click outside it (the ticks are discarded).
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

  const appliedCount = activeMenuFilters(applied);
  const draftCount = draft.country.length + draft.vendor.length;

  // --- Render ---
  return (
    <div ref={panelRef} className="relative flex flex-wrap items-center justify-end gap-2">
      {/* Active filters as chips; × removes just that one. */}
      {chips.map((c) => (
        <span
          key={`${c.group}-${c.value}`}
          className="inline-flex min-h-8 items-center gap-1 rounded-full bg-accent-soft py-0.5 pr-1 pl-3 text-sm font-medium text-accent"
        >
          {labelOf(c.group, c.value)}
          <button
            type="button"
            onClick={() => removeChip(c.group, c.value)}
            aria-label={`Remove filter ${labelOf(c.group, c.value)}`}
            className="grid size-6 place-items-center rounded-full hover:bg-accent/15"
          >
            ×
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        aria-controls={panelId}
        // Blue so it reads as a control: tinted when no filters are on, solid when some are.
        className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${
          appliedCount
            ? "border-accent bg-accent text-inverse hover:bg-accent-dark"
            : "border-accent/30 bg-accent-soft text-accent hover:border-accent/60"
        } ${open ? "ring-2 ring-accent/30" : ""}`}
      >
        <Icon name="filter" className="size-4" />
        Filters
        {appliedCount > 0 && (
          <span className="num grid size-5 place-items-center rounded-full bg-surface text-xs text-accent">
            {appliedCount}
          </span>
        )}
        {isPending && <Spinner className="size-3.5" />}
      </button>

      {/* The panel: one checkbox group per filter type, then Clear and Apply. */}
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Filter purchase orders"
          className="absolute top-full right-0 z-20 mt-2 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-lg motion-safe:animate-fade-in"
        >
          <CheckboxGroup title="Origin" options={countries} selected={draft.country} onToggle={(v) => toggle("country", v)} />
          <CheckboxGroup title="Vendor" options={vendors} selected={draft.vendor} onToggle={(v) => toggle("vendor", v)} />
          <div className="flex items-center justify-between border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setDraft({ country: [], vendor: [] })}
              disabled={draftCount === 0}
              className="text-sm font-medium text-accent disabled:text-muted"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => {
                go(draft.country, draft.vendor);
                setOpen(false);
              }}
              className="inline-flex min-h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-inverse hover:bg-accent-dark"
            >
              Apply{draftCount > 0 ? ` (${draftCount})` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
