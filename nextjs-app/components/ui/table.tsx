/**
 * Table cells with one padding and alignment rule, so every table lines up the same way.
 * `dense` is for wide tables with many columns (the 12-column PO line items). No hooks.
 */

import Link from "next/link";
import { useId } from "react";

type Align = "left" | "right";

/**
 * A header's text. With a `hint`, it gets a dotted underline and a tooltip that shows at once on
 * hover or keyboard focus (a native `title` shows late and never on focus). The tooltip is linked
 * with aria-describedby, so screen readers read it, and it is hidden (not just transparent) until
 * shown, so it doesn't end up in copied text. Right-aligned headers open their tooltip to the left,
 * so it stays inside the table.
 */
function HeaderLabel({ label, hint, align = "left" }: { label: string; hint?: string; align?: Align }) {
  const id = useId();
  if (!hint) return <>{label}</>;
  return (
    <span className="group/tip relative inline-flex">
      <span
        tabIndex={0}
        aria-describedby={id}
        className="cursor-help underline decoration-dotted decoration-line-strong underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {label}
      </span>
      <span
        id={id}
        role="tooltip"
        className={`invisible absolute top-full z-20 mt-2 w-56 rounded-md bg-ink px-3 py-2 text-left text-xs font-normal whitespace-normal text-inverse opacity-0 shadow-lg transition-opacity group-hover/tip:visible group-hover/tip:opacity-100 group-focus-within/tip:visible group-focus-within/tip:opacity-100 ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {hint}
      </span>
    </span>
  );
}

/** Header cell. scope="col" tells screen readers which column each data cell belongs to. */
export function Th({
  children,
  align = "left",
  dense = false,
  hint,
}: {
  children: React.ReactNode;
  align?: Align;
  dense?: boolean;
  hint?: string; // tooltip explaining the column
}) {
  return (
    <th
      scope="col"
      className={`${dense ? "px-2.5" : "px-4"} py-3 font-semibold whitespace-nowrap text-ink ${align === "right" ? "text-right" : "text-left"}`}
    >
      {hint && typeof children === "string" ? <HeaderLabel label={children} hint={hint} align={align} /> : children}
    </th>
  );
}

/** Data cell. `align="right"` is for numbers, `mono` for codes. */
export function Td({
  children,
  align = "left",
  mono = false,
  dense = false,
  className = "",
}: {
  children?: React.ReactNode;
  align?: Align;
  mono?: boolean; // codes such as SKU, UPC, PO number
  dense?: boolean; // tighter sides for many-column tables
  className?: string;
}) {
  // Right-aligned cells hold numbers, so their digits line up.
  const alignment = align === "right" ? "num text-right" : "";
  return (
    <td className={`${dense ? "px-2.5" : "px-4"} py-3 ${alignment} ${mono ? "font-mono" : ""} ${className}`}>{children}</td>
  );
}

/**
 * Header cell that sorts its column: a link to the same page sorted by it, with an arrow for
 * the current direction and a faint ↕ on columns you can sort. aria-sort tells screen readers
 * which column is sorted and which way. Used by the PO list and the PO line items.
 */
export function SortTh({
  label,
  href,
  dir,
  align = "left",
  dense = false,
  hint,
}: {
  label: string;
  hint?: string; // tooltip explaining the column
  href: string;
  dir?: "asc" | "desc"; // set when this column is the sorted one
  align?: Align;
  dense?: boolean;
}) {
  const ariaSort = dir ? (dir === "asc" ? "ascending" : "descending") : undefined;
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`${dense ? "px-2.5" : "px-4"} py-3 font-semibold ${align === "right" ? "text-right" : "text-left"}`}
    >
      <Link
        href={href}
        scroll={false}
        className={`inline-flex items-center gap-1 whitespace-nowrap text-ink hover:text-accent ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <HeaderLabel label={label} hint={hint} align={align} />
        <span aria-hidden className={dir ? "text-accent" : "text-line-strong"}>
          {dir ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}
