"use client";

/**
 * "Filters" button in the PO list toolbar, and the chips for what is filtered.
 *
 * The panel is laid out the way a person thinks about it, master PO first (the parent order):
 *   Master PO: a list.
 *   Origin & vendor: a tree, country > the vendors that ship from it. Ticking a country takes
 *     everything from there; ticking some vendors shows the country as partly ticked.
 * The server sends only options that would return POs (lib/filters.ts filterOptions), with counts.
 * Every tick applies at once.
 *
 * Chips: one per group. One value shows as itself ("China ×"); several show as
 * "Origin & vendor (2) ▾", which opens the list of values, each removable.
 *
 * Client Component: it keeps the ticks in local state so they change instantly, and pushes the
 * new URL in a transition; the server then renders the table, tabs and counts again.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import {
  filtersFromSearchParams,
  type CountryNode,
  type FacetOption,
} from "@/lib/filters";
import { listHref, parseSort } from "@/lib/sort";
import { parsePaging } from "@/lib/paginate";

type Selection = { country: string[]; vendor: string[]; master: string[] };
const empty: Selection = { country: [], vendor: [], master: [] };
type Options = { origin: CountryNode[]; master: FacetOption[] };

/** A checkbox that can show "partly ticked" (the native indeterminate state). */
function TreeCheckbox({
  checked,
  partly,
  onChange,
  label,
  count,
  strong = false,
}: {
  checked: boolean;
  partly?: boolean;
  onChange: () => void;
  label: string;
  count: number;
  strong?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!partly && !checked;
  }, [partly, checked]);
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-subtle">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 accent-accent"
      />
      <span
        className={`flex-1 ${strong ? "font-medium" : ""} ${count === 0 ? "text-muted" : ""}`}
      >
        {label}
      </span>
      <span className="num text-xs text-muted">{count}</span>
    </label>
  );
}

/** Group heading with Select all / Clear. */
function GroupHeading({
  title,
  onAll,
  onClear,
  allDisabled,
  clearDisabled,
}: {
  title: string;
  onAll: () => void;
  onClear: () => void;
  allDisabled: boolean;
  clearDisabled: boolean;
}) {
  const link =
    "text-accent hover:underline disabled:text-muted disabled:no-underline";
  return (
    <div className="mb-1 flex items-center justify-between">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">
        {title}
      </span>
      <span className="flex gap-3 text-xs font-medium">
        <button
          type="button"
          onClick={onAll}
          disabled={allDisabled}
          className={link}
        >
          Select all
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={clearDisabled}
          className={link}
        >
          Clear
        </button>
      </span>
    </div>
  );
}

/** One chip per filter group. Several values collapse into "Group (n) ▾" with a list to remove from. */
function GroupChip({
  title,
  items,
  onClearGroup,
}: {
  title: string;
  items: { key: string; label: string; remove: () => void }[];
  onClearGroup: () => void;
}) {
  const [open, setOpen] = useState(false);
  const chip =
    "inline-flex min-h-8 items-center gap-1 rounded-full bg-accent-soft py-0.5 text-sm font-medium text-accent";
  if (items.length === 0) return null;
  if (items.length === 1) {
    const [only] = items;
    return (
      <span className={`${chip} pr-1 pl-3 motion-safe:animate-fade-in`}>
        {only.label}
        <button
          type="button"
          onClick={only.remove}
          aria-label={`Remove filter ${only.label}`}
          className="grid size-6 place-items-center rounded-full hover:bg-accent/15"
        >
          ×
        </button>
      </span>
    );
  }
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`${chip} px-3 motion-safe:animate-fade-in`}
      >
        {title} ({items.length})
        <span
          aria-hidden
          className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <span className="absolute top-full right-0 z-30 mt-2 flex w-64 flex-col gap-1 rounded-xl border border-line bg-surface p-2 shadow-lg">
          {items.map((i) => (
            <span
              key={i.key}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-subtle"
            >
              <span className="text-sm">{i.label}</span>
              <button
                type="button"
                onClick={i.remove}
                aria-label={`Remove filter ${i.label}`}
                className="grid size-6 place-items-center rounded-full text-muted hover:bg-line hover:text-ink"
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearGroup}
            className="mt-1 border-t border-line px-2 pt-2 text-left text-sm font-medium text-accent"
          >
            Clear {title.toLowerCase()}
          </button>
        </span>
      )}
    </span>
  );
}

/** Filters button, its panel, and the grouped chips. */
export function FiltersMenu({ options }: { options: Options }) {
  const params = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);

  // --- Selection: the URL is the source of truth; local state makes ticks feel instant ---
  const applied = filtersFromSearchParams(params);
  const sort = parseSort(
    params.get("sort") ?? undefined,
    params.get("dir") ?? undefined,
  );
  const urlKey = params.toString();
  const pick = (f: Selection): Selection => ({
    country: f.country,
    vendor: f.vendor,
    master: f.master,
  });
  const [sel, setSel] = useState<Selection>(pick(applied));
  // When the URL changes from elsewhere (a chip, a tab, the back button), follow it.
  useEffect(
    () => setSel(pick(filtersFromSearchParams(new URLSearchParams(urlKey)))),
    [urlKey],
  );

  /** Updates the ticks at once, then loads the filtered list in a transition. */
  function apply(next: Selection) {
    setSel(next);
    // New filters, back to page 1; rows per page is kept.
    const { per } = parsePaging(undefined, params.get("per") ?? undefined);
    startTransition(() =>
      router.push(listHref({ q: applied.q, status: applied.status, ...next }, sort, { page: 1, per }), {
        scroll: false,
      }),
    );
  }

  // --- Tree logic: a ticked country stands for all of its vendors ---
  const vendorsOf = (country: string) =>
    options.origin
      .find((c) => c.value === country)
      ?.vendors.map((v) => v.value) ?? [];
  function toggleCountry(c: string) {
    const mine = vendorsOf(c);
    const whole = sel.country.includes(c);
    apply({
      ...sel,
      country: whole ? sel.country.filter((x) => x !== c) : [...sel.country, c],
      vendor: sel.vendor.filter((v) => !mine.includes(v)), // the country now covers (or drops) them
    });
  }
  function toggleVendor(v: string, c: string) {
    const mine = vendorsOf(c);
    if (sel.country.includes(c)) {
      // Unticking one vendor of a fully ticked country: keep the others as vendors.
      return apply({
        ...sel,
        country: sel.country.filter((x) => x !== c),
        vendor: [...sel.vendor, ...mine.filter((x) => x !== v)],
      });
    }
    const vendor = sel.vendor.includes(v)
      ? sel.vendor.filter((x) => x !== v)
      : [...sel.vendor, v];
    // Every vendor of the country ticked: that's the whole country.
    if (mine.length > 0 && mine.every((x) => vendor.includes(x))) {
      return apply({
        ...sel,
        country: [...sel.country, c],
        vendor: vendor.filter((x) => !mine.includes(x)),
      });
    }
    apply({ ...sel, vendor });
  }

  // --- Chips ---
  const label = (value: string) =>
    options.origin.find((c) => c.value === value)?.label ??
    options.origin.flatMap((c) => c.vendors).find((v) => v.value === value)
      ?.label ??
    value;
  const originItems = [
    ...sel.country.map((c) => ({
      key: `c-${c}`,
      label: label(c),
      remove: () => toggleCountry(c),
    })),
    ...sel.vendor.map((v) => ({
      key: `v-${v}`,
      label: label(v),
      remove: () =>
        apply({ ...sel, vendor: sel.vendor.filter((x) => x !== v) }),
    })),
  ];
  const masterItems = sel.master.map((m) => ({
    key: `m-${m}`,
    label: `Master PO ${m}`,
    remove: () => apply({ ...sel, master: sel.master.filter((x) => x !== m) }),
  }));
  const count = originItems.length + masterItems.length;

  // Close the panel on Escape or on a click outside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) =>
      !panelRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // --- Render ---
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <GroupChip
        title="Origin & vendor"
        items={originItems}
        onClearGroup={() => apply({ ...sel, country: [], vendor: [] })}
      />
      <GroupChip
        title="Master PO"
        items={masterItems}
        onClearGroup={() => apply({ ...sel, master: [] })}
      />
      {count > 1 && (
        <button
          type="button"
          onClick={() => apply(empty)}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          Clear all
        </button>
      )}

      <div ref={panelRef} className="relative">
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
            <span className="num grid size-5 place-items-center rounded-full bg-surface text-xs text-accent">
              {count}
            </span>
          )}
          {isPending && <Spinner className="size-3.5" />}
        </button>

        {open && (
          <div
            id={panelId}
            role="dialog"
            aria-label="Filter purchase orders"
            className="absolute top-full right-0 z-30 mt-2 flex max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] flex-col gap-4 overflow-y-auto rounded-xl border border-line bg-surface p-4 shadow-lg motion-safe:animate-appear"
          >
            {/* Master PO: a flat list */}
            <fieldset className="flex flex-col" aria-label="Master PO">
              <GroupHeading
                title="Master PO"
                onAll={() =>
                  apply({
                    ...sel,
                    master: options.master
                      .filter((m) => m.count > 0)
                      .map((m) => m.value),
                  })
                }
                onClear={() => apply({ ...sel, master: [] })}
                allDisabled={options.master
                  .filter((m) => m.count > 0)
                  .every((m) => sel.master.includes(m.value))}
                clearDisabled={sel.master.length === 0}
              />
              {options.master.map((m) => (
                <TreeCheckbox
                  key={m.value}
                  checked={sel.master.includes(m.value)}
                  onChange={() =>
                    apply({
                      ...sel,
                      master: sel.master.includes(m.value)
                        ? sel.master.filter((x) => x !== m.value)
                        : [...sel.master, m.value],
                    })
                  }
                  label={m.label}
                  count={m.count}
                />
              ))}
            </fieldset>

            {/* Origin & vendor: country > vendors */}
            <fieldset className="flex flex-col" aria-label="Origin and vendor">
              <GroupHeading
                title="Origin & vendor"
                onAll={() =>
                  apply({
                    ...sel,
                    country: options.origin.map((c) => c.value),
                    vendor: [],
                  })
                }
                onClear={() => apply({ ...sel, country: [], vendor: [] })}
                allDisabled={options.origin.every((c) =>
                  sel.country.includes(c.value),
                )}
                clearDisabled={originItems.length === 0}
              />
              {options.origin.length === 0 && (
                <p className="px-2 text-sm text-muted">
                  Nothing to filter here.
                </p>
              )}
              {options.origin.map((c) => {
                const whole = sel.country.includes(c.value);
                const some = c.vendors.some((v) =>
                  sel.vendor.includes(v.value),
                );
                return (
                  <div key={c.value}>
                    <TreeCheckbox
                      strong
                      checked={whole}
                      partly={some}
                      onChange={() => toggleCountry(c.value)}
                      label={c.label}
                      count={c.count}
                    />
                    {/* Vendors that ship from this country, indented under it */}
                    <div className="ml-5 border-l border-line pl-2">
                      {c.vendors.map((v) => (
                        <TreeCheckbox
                          key={v.value}
                          checked={whole || sel.vendor.includes(v.value)}
                          onChange={() => toggleVendor(v.value, c.value)}
                          label={v.label}
                          count={v.count}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </fieldset>

            <div className="flex items-center justify-between border-t border-line pt-3">
              <button
                type="button"
                onClick={() => apply(empty)}
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
    </div>
  );
}
