/**
 * Table cells with one padding and alignment rule, so every table lines up the same way.
 * `dense` is for wide tables with many columns (the 12-column PO line items). No hooks.
 */

import Link from "next/link";

type Align = "left" | "right";

/** Header cell. scope="col" tells screen readers which column each data cell belongs to. */
export function Th({ children, align = "left", dense = false }: { children: React.ReactNode; align?: Align; dense?: boolean }) {
  return (
    <th
      scope="col"
      className={`${dense ? "px-2.5" : "px-4"} py-3 font-medium whitespace-nowrap text-muted ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
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
}: {
  label: string;
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
      className={`${dense ? "px-2.5" : "px-4"} py-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <Link
        href={href}
        scroll={false}
        className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-ink ${dir ? "text-ink" : "text-muted"} ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        {label}
        <span aria-hidden className={dir ? "text-accent" : "text-line-strong"}>
          {dir ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}
