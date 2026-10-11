"use client";

/**
 * A master PO group in the PO list, which can be collapsed and expanded. Client Component
 * only for the open/closed state; the header content and the PO rows are rendered on the
 * server and passed in. Groups start open. Two layouts: table rows (desktop) and a section
 * with a list (phone).
 */

import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** The chevron button. It rotates when the group is closed. */
function Toggle({ open, onClick, controls, label }: { open: boolean; onClick: () => void; controls: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
      className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-line hover:text-ink"
    >
      <Icon name="chevron" className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`} />
    </button>
  );
}

/** Desktop: a <tbody> with a header row (toggle + summary) and the PO rows when open. */
export function MasterGroupRows({
  label,
  header,
  columns,
  children,
}: {
  label: string;
  header: React.ReactNode;
  columns: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <tbody id={id} className="border-b border-line last:border-b-0">
      <tr className="bg-subtle/70">
        <th scope="rowgroup" colSpan={columns} className="px-2 py-1.5 text-left font-normal">
          <span className="flex items-center gap-2">
            <Toggle open={open} onClick={() => setOpen(!open)} controls={id} label={label} />
            {header}
          </span>
        </th>
      </tr>
      {open && children}
    </tbody>
  );
}

/** Phone: a section with a heading (toggle + summary) and the PO list when open. */
export function MasterGroupSection({ label, header, children }: { label: string; header: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <section aria-label={label}>
      <h3 className="flex items-center gap-2 border-b border-line bg-subtle/70 px-2 py-1.5 text-sm font-normal">
        <Toggle open={open} onClick={() => setOpen(!open)} controls={id} label={label} />
        {header}
      </h3>
      <div id={id}>{open && children}</div>
    </section>
  );
}
