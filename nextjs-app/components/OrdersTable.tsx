/**
 * The PO table on the home page. Async Server Component. app/page.tsx keys its Suspense
 * boundary by the filters and the sort, so changing any of them reloads only this part.
 *
 * POs are grouped under their master PO (the parent order printed as "REF MASTER PO#"):
 * a header row per master PO, its POs indented beneath. One value per cell. Every column but
 * "Ships from" sorts (inside each group), and the whole row opens the PO. Sorting and filtering happen on the server from the URL, so
 * the header links are plain links.
 */

import Link from "next/link";
import { MasterGroupRows, MasterGroupSection } from "@/components/MasterGroup";
import { StatusBadge } from "@/components/StatusBadge";
import { linkClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SortTh, Td } from "@/components/ui/table";
import { formatDate, formatMoney, titleCase, vendorName } from "@/lib/format";
import { getOrders } from "@/lib/orders";
import { matches, type ListFilters } from "@/lib/filters";
import { reviewStatuses, type Order } from "@/lib/types";
import { countryName, originOf } from "@/lib/origin";
import { listHref, nextSort, sortOrders, type Sort, type SortKey } from "@/lib/sort";

type Filters = ListFilters;

/** What to say when the filters leave no rows. */
function emptyMessage({ status, country, vendor, master }: Filters): { title: string; detail: string; caughtUp: boolean } {
  const where = (country.length ? ` from ${country.map(countryName).join(" or ")}` : "") + (vendor.length ? " for these vendors" : "") + (master.length ? ` under master PO ${master.join(" or ")}` : "");
  if (status === "pending") {
    return { title: `No POs waiting for review${where}`, detail: "All caught up. New POs will show here.", caughtUp: true };
  }
  if (status === "needs_correction") {
    return { title: `No POs waiting for a correction${where}`, detail: "Nothing has been sent back to a vendor.", caughtUp: true };
  }
  if (status === "approved") {
    return { title: `No approved POs${where} yet`, detail: "Approve a PO and it will show here.", caughtUp: false };
  }
  return { title: `No POs${where}`, detail: "Try other filters.", caughtUp: false };
}

/** Friendly empty state with a small pop-in animation (off when reduced motion is on). */
function EmptyState(filters: Filters) {
  const { title, detail, caughtUp } = emptyMessage(filters);
  return (
    <div role="status" className="flex flex-col items-center gap-3 px-4 py-14 text-center motion-safe:animate-fade-in">
      <span
        className={`grid size-12 place-items-center rounded-full motion-safe:animate-pop ${
          caughtUp ? "bg-approved-bg text-approved" : "bg-subtle text-muted"
        }`}
      >
        <Icon name={caughtUp ? "check" : "search"} className="size-6" />
      </span>
      <span className="font-semibold">{title}</span>
      <span className="text-muted">{detail}</span>
      <Link href={listHref({}, { key: "ship", dir: "asc" })} className={`${linkClass} text-sm`}>
        Show all purchase orders
      </Link>
    </div>
  );
}

/** Groups orders by master PO, keeping the sorted order: groups appear in the order of their
 *  first PO, and POs keep their sorted order inside each group. */
function groupByMaster(orders: Order[]): { master: string; orders: Order[] }[] {
  const groups = new Map<string, Order[]>();
  for (const o of orders) groups.set(o.refMasterPo, [...(groups.get(o.refMasterPo) ?? []), o]);
  return [...groups].map(([master, list]) => ({ master, orders: list }));
}

/** "1 pending · 1 approved · 1 needs correction" for a group header, leaving out zeros. */
function statusSummary(orders: Order[]): string {
  return reviewStatuses
    .map((status) => [status, orders.filter((o) => o.status === status).length] as const)
    .filter(([, n]) => n > 0)
    .map(([status, n]) => `${n} ${status.replace("_", " ")}`)
    .join(" · ");
}

/** Header of a master PO group: number (filters to it), PO count, statuses, and total value. */
function GroupSummary({ group, href }: { group: { master: string; orders: Order[] }; href: string }) {
  const total = group.orders.reduce((t, o) => t + o.totalCost, 0);
  return (
    <span className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">Master PO</span>
      <Link href={href} scroll={false} className={`${linkClass} font-mono`}>
        {group.master}
      </Link>
      <span className="text-xs text-muted">
        {group.orders.length} {group.orders.length === 1 ? "PO" : "POs"} · {statusSummary(group.orders)}
      </span>
      <span className="num ml-auto pr-2 text-sm font-semibold">{formatMoney(total)}</span>
    </span>
  );
}

/** The order rows for the current filters and sort, grouped under their master PO. */
export async function OrdersTable({ filters, sort }: { filters: Filters; sort: Sort }) {
  // --- Data ---
  const shown = sortOrders((await getOrders()).filter((o) => matches(o, filters)), sort);
  const groups = groupByMaster(shown);
  const header = (label: string, column: SortKey, align?: "left" | "right") => (
    <SortTh
      label={label}
      href={listHref(filters, nextSort(sort, column))}
      dir={sort.key === column ? sort.dir : undefined}
      align={align}
    />
  );
  // Link that narrows the list to one master PO, keeping the other filters and the sort.
  const masterHref = (master: string) => listHref({ ...filters, master: [master] }, sort);

  // --- Render ---
  if (shown.length === 0) return <EmptyState {...filters} />;

  return (
    <div className="motion-safe:animate-fade-in">
      {/* Desktop: table (hidden below md). One collapsible <tbody> per master PO: a header row, then its POs. */}
      <table className="hidden w-full md:table">
        <caption className="sr-only">Purchase orders, grouped by master PO</caption>
        <thead className="border-b border-line bg-subtle">
          <tr>
            {header("PO number", "po")}
            {header("Status", "status")}
            {header("Vendor", "vendor")}
            <th scope="col" className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted">
              Ships from
            </th>
            {header("Ship date", "ship")}
            {header("Lines", "lines", "right")}
            {header("Total cost", "total", "right")}
          </tr>
        </thead>
        {groups.map((g) => (
          <MasterGroupRows
            key={g.master}
            label={`master PO ${g.master}`}
            columns={7}
            header={<GroupSummary group={g} href={masterHref(g.master)} />}
          >
            {g.orders.map((o) => {
              const { port, country: code } = originOf(o);
              return (
                // The PO link is stretched over the whole row (after:absolute inset-0), so a click
                // anywhere opens the PO, while keyboard and screen readers still get one real link.
                <tr key={o.poNumber} className="relative cursor-pointer border-t border-line transition-colors hover:bg-accent-soft/50">
                  <Td mono>
                    {/* Tree connector: shows this PO sits under the master PO above it */}
                    <span aria-hidden className="mr-2 text-line-strong">└</span>
                    <Link
                      href={`/orders/${o.poNumber}`}
                      className={`${linkClass} after:absolute after:inset-0 after:content-['']`}
                    >
                      {o.poNumber}
                    </Link>
                  </Td>
                  <Td>
                    <StatusBadge status={o.status} />
                  </Td>
                  <Td className="font-medium whitespace-nowrap">{titleCase(vendorName(o))}</Td>
                  <Td className="whitespace-nowrap text-muted">
                    {port}
                    {code && `, ${countryName(code)}`}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDate(o.shipDate)}</Td>
                  <Td align="right">{o.lines.length}</Td>
                  <Td align="right" className="font-semibold">
                    {formatMoney(o.totalCost)}
                  </Td>
                </tr>
              );
            })}
          </MasterGroupRows>
        ))}
      </table>

      {/* Phone: the same groups, each a collapsible heading with its POs as cards (hidden from md up) */}
      <div className="md:hidden">
        {groups.map((g) => (
          <MasterGroupSection key={g.master} label={`Master PO ${g.master}`} header={<GroupSummary group={g} href={masterHref(g.master)} />}>
            <ul className="divide-y divide-line border-b border-line">
              {g.orders.map((o) => (
                <li key={o.poNumber}>
                  <Link href={`/orders/${o.poNumber}`} className="flex flex-col gap-1 py-3 pr-4 pl-8 hover:bg-subtle">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-mono font-medium text-accent">{o.poNumber}</span>
                      <StatusBadge status={o.status} />
                    </span>
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{titleCase(vendorName(o))}</span>
                      <span className="num font-semibold">{formatMoney(o.totalCost)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </MasterGroupSection>
        ))}
      </div>
    </div>
  );
}
