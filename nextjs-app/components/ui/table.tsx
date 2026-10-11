/**
 * Table cells with one padding and alignment rule, so every table lines up the same way.
 * Used by OrdersTable and OrderDetail. No hooks.
 */

type Align = "left" | "right";

/** Header cell. scope="col" tells screen readers which column each data cell belongs to. */
export function Th({ children, align = "left" }: { children: React.ReactNode; align?: Align }) {
  return (
    <th scope="col" className={`px-3 py-2.5 font-medium text-muted ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

/** Data cell. `align="right"` is for numbers, `mono` for codes. */
export function Td({
  children,
  align = "left",
  mono = false,
  className = "",
}: {
  children?: React.ReactNode;
  align?: Align;
  mono?: boolean; // codes such as SKU, UPC, PO number
  className?: string;
}) {
  // Right-aligned cells hold numbers, so their digits line up.
  const alignment = align === "right" ? "num text-right" : "";
  return (
    <td className={`px-3 py-3 ${alignment} ${mono ? "font-mono" : ""} ${className}`}>{children}</td>
  );
}
