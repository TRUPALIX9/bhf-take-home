import { notFound } from "next/navigation";
import { ReviewPanel } from "@/components/ReviewPanel";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/Card";
import { Td, Th } from "@/components/ui/table";
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
  // The page already returned a real 404 via orderExists(); this only guards the type.
  if (!order) notFound();

  const totals = lineTotals(order.lines);
  const totalsMatch = totals.extCost === order.totalCost;

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
    <div className="flex flex-col gap-6 motion-safe:animate-fade-in">
      <ReviewPanel
        poNumber={order.poNumber}
        status={order.status}
        subtitle={`${vendorName(order)} · ships ${formatDate(order.shipDate)} · ${order.shipTerms}`}
        poDate={formatDate(order.poDate)}
        lineCount={order.lines.length}
        totalsMatch={totalsMatch}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total cost" value={formatMoney(order.totalCost)} />
        <StatCard label="Units" value={formatCount(totals.extQty)} note={`${order.lines.length} SKUs`} />
        <StatCard label="Cartons" value={formatCount(totals.cartons)} />
        <StatCard
          label="Line check"
          value={totalsMatch ? "Matches" : "Mismatch"}
          note={totalsMatch ? "Lines add up to the PO total" : `Lines add up to ${formatMoney(totals.extCost)}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Order details">
          <dl className="flex flex-col gap-2">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        {addresses.map(([label, lines]) => (
          <Card key={label} title={label}>
            <address className="flex flex-col text-muted not-italic">
              {lines.map((line, i) => (
                <span key={i} className={i === 0 ? "text-ink" : undefined}>
                  {line}
                </span>
              ))}
            </address>
          </Card>
        ))}
      </div>

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
            <caption className="sr-only">Line items for {order.poNumber}</caption>
            <thead className="bg-subtle">
              <tr>
                <Th>SKU / UPC</Th>
                <Th>Description</Th>
                <Th>Vendor part</Th>
                <Th align="right">Retail</Th>
                <Th align="right">Unit cost</Th>
                <Th align="right">Cartons × pack</Th>
                <Th align="right">Units</Th>
                <Th align="right">Ext cost</Th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => (
                <tr key={l.sku} className="border-t border-line">
                  <Td mono>
                    <span className="block">{l.sku}</span>
                    <span className="block text-xs text-muted">{l.upc}</span>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span className="block">{l.description}</span>
                    <span className="block text-xs text-muted">Dept {l.dept}</span>
                  </Td>
                  <Td mono>{l.vendorPart}</Td>
                  <Td align="right">{formatMoney(l.retail)}</Td>
                  <Td align="right">{formatUnitCost(l.cost)}</Td>
                  <Td align="right" className="whitespace-nowrap text-muted">
                    {formatCount(l.cartons)} × {l.casePack}
                  </Td>
                  <Td align="right">{formatCount(l.extQty)}</Td>
                  <Td align="right" className="font-medium">
                    {formatMoney(l.extCost)}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-line-strong bg-subtle font-semibold">
              <tr>
                <Td className="text-left">Total</Td>
                <Td />
                <Td />
                <Td />
                <Td />
                <Td align="right">{formatCount(totals.cartons)} ctns</Td>
                <Td align="right">{formatCount(totals.extQty)}</Td>
                <Td align="right">
                  <span data-testid="lines-total">{formatMoney(totals.extCost)}</span>
                </Td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
