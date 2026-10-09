import { notFound } from "next/navigation";
import { ProcessSteps, type Step } from "@/components/ProcessSteps";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ToggleStatusButton } from "@/components/ToggleStatusButton";
import {
  formatCount,
  formatDate,
  formatMoney,
  formatUnitCost,
  lineTotals,
  vendorName,
} from "@/lib/format";
import { getOrder } from "@/lib/orders";

/** Everything on the PO page below the breadcrumb. Streams in behind OrderDetailSkeleton. */
export async function OrderDetail({ poNumber }: { poNumber: string }) {
  const order = await getOrder(poNumber);
  if (!order) notFound();

  const totals = lineTotals(order.lines);
  const totalsMatch = totals.extCost === order.totalCost;

  const steps: Step[] = [
    { title: "Received", detail: `PO dated ${formatDate(order.poDate)}`, state: "done" },
    {
      title: "Parsed and checked",
      detail: totalsMatch
        ? `${order.lines.length} lines, totals match`
        : "Line totals do not match the PO",
      state: totalsMatch ? "done" : "problem",
    },
    {
      title: "Review",
      detail: order.status === "approved" ? "Approved" : "Waiting for approval",
      state: order.status === "approved" ? "done" : "current",
    },
    {
      title: "Ready for downstream",
      detail: order.status === "approved" ? "Can be sent on" : "After approval",
      state: order.status === "approved" ? "done" : "upcoming",
    },
  ];

  const details = [
    ["PO date", formatDate(order.poDate)],
    ["Ship date", formatDate(order.shipDate)],
    ["Ship terms", order.shipTerms],
    ["Buyer", order.buyer],
    ["Ref master PO", order.refMasterPo],
  ];
  const addresses = [
    ["Vendor", order.vendor],
    ["Ship to", order.shipTo],
    ["Bill to", order.billTo],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      {/* Title bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-semibold tracking-tight">{order.poNumber}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-muted">
              {vendorName(order)} · ships {formatDate(order.shipDate)} · {order.shipTerms}
            </p>
          </div>
          <ToggleStatusButton poNumber={order.poNumber} status={order.status} />
        </div>
      </div>

      <ProcessSteps steps={steps} />

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total cost" value={formatMoney(order.totalCost)} />
        <StatCard label="Units" value={formatCount(totals.extQty)} note={`${order.lines.length} SKUs`} />
        <StatCard label="Cartons" value={formatCount(totals.cartons)} />
        <StatCard
          label="Line check"
          value={totalsMatch ? "Matches" : "Mismatch"}
          note={
            totalsMatch
              ? "Lines add up to the PO total"
              : `Lines add up to ${formatMoney(totals.extCost)}`
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {/* Line items */}
        <section aria-labelledby="lines-heading" className="flex min-w-0 flex-col gap-3">
          <h2 id="lines-heading" className="text-base font-semibold">
            Line items
          </h2>
          <div
            className="overflow-x-auto rounded-lg border border-line"
            role="region"
            tabIndex={0}
            aria-label="Line items, scrolls sideways"
          >
            <table className="w-full min-w-[58rem]">
              <thead className="bg-subtle text-left text-muted">
                <tr>
                  <th className="px-3 py-2.5 font-medium">SKU / UPC</th>
                  <th className="px-3 py-2.5 font-medium">Description</th>
                  <th className="px-3 py-2.5 font-medium">Vendor part</th>
                  <th className="px-3 py-2.5 text-right font-medium">Retail</th>
                  <th className="px-3 py-2.5 text-right font-medium">Unit cost</th>
                  <th className="px-3 py-2.5 text-right font-medium">Cartons × pack</th>
                  <th className="px-3 py-2.5 text-right font-medium">Units</th>
                  <th className="px-3 py-2.5 text-right font-medium">Ext cost</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l) => (
                  <tr key={l.sku} className="border-t border-line">
                    <td className="px-3 py-2.5 font-mono">
                      <span className="block">{l.sku}</span>
                      <span className="block text-xs text-muted">{l.upc}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="block">{l.description}</span>
                      <span className="block text-xs text-muted">Dept {l.dept}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">{l.vendorPart}</td>
                    <td className="num px-3 py-2.5 text-right">{formatMoney(l.retail)}</td>
                    <td className="num px-3 py-2.5 text-right">{formatUnitCost(l.cost)}</td>
                    <td className="num px-3 py-2.5 text-right whitespace-nowrap text-muted">
                      {formatCount(l.cartons)} × {l.casePack}
                    </td>
                    <td className="num px-3 py-2.5 text-right">{formatCount(l.extQty)}</td>
                    <td className="num px-3 py-2.5 text-right font-medium">{formatMoney(l.extCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line-strong bg-subtle font-semibold">
                <tr>
                  <td className="px-3 py-3" colSpan={5}>
                    Total
                  </td>
                  <td className="num px-3 py-3 text-right">{formatCount(totals.cartons)} ctns</td>
                  <td className="num px-3 py-3 text-right">{formatCount(totals.extQty)}</td>
                  <td className="num px-3 py-3 text-right" data-testid="lines-total">
                    {formatMoney(totals.extCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Order details */}
        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-line p-4" aria-labelledby="details-heading">
            <h2 id="details-heading" className="mb-3 text-base font-semibold">
              Order details
            </h2>
            <dl className="flex flex-col gap-2.5">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {addresses.map(([label, lines]) => (
            <section key={label} className="rounded-lg border border-line p-4">
              <h2 className="mb-2 text-base font-semibold">{label}</h2>
              <address className="flex flex-col text-muted not-italic">
                {lines.map((line, i) => (
                  <span key={i} className={i === 0 ? "text-ink" : undefined}>
                    {line}
                  </span>
                ))}
              </address>
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}
