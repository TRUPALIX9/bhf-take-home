import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { ToggleStatusButton } from "@/components/ToggleStatusButton";
import {
  formatCount,
  formatDate,
  formatMoney,
  formatUnitCost,
  lineTotals,
} from "@/lib/format";
import { getOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ poNumber: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { poNumber } = await params;
  return { title: `PO ${poNumber}` };
}

export default async function OrderPage({ params }: Props) {
  const { poNumber } = await params;
  const order = getOrder(poNumber);
  if (!order) notFound();

  const totals = lineTotals(order.lines);
  const totalsMatch = totals.extCost === order.totalCost;

  const facts = [
    ["Ref master PO", order.refMasterPo],
    ["PO date", formatDate(order.poDate)],
    ["Ship date", formatDate(order.shipDate)],
    ["Ship terms", order.shipTerms],
    ["Buyer", order.buyer],
    ["Total cost", formatMoney(order.totalCost)],
  ];
  const addresses = [
    ["Vendor", order.vendor],
    ["Ship to", order.shipTo],
    ["Bill to", order.billTo],
  ] as const;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
          ← All purchase orders
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="label">Purchase order</span>
            <h1 className="font-display text-4xl font-semibold">{order.poNumber}</h1>
            <StatusBadge status={order.status} />
          </div>
          <ToggleStatusButton poNumber={order.poNumber} status={order.status} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-6 sm:grid-cols-3 lg:grid-cols-6">
        {facts.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-1">
            <dt className="label">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 sm:grid-cols-3">
        {addresses.map(([label, lines]) => (
          <address key={label} className="flex flex-col gap-1 text-sm not-italic">
            <span className="label mb-1">{label}</span>
            {lines.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </address>
        ))}
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="lines-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="lines-heading" className="font-display text-2xl font-semibold">
            Line items
          </h2>
          <p className={`text-sm ${totalsMatch ? "text-approved" : "text-danger"}`}>
            {totalsMatch
              ? `${order.lines.length} lines add up to the PO total`
              : `Lines add up to ${formatMoney(totals.extCost)}, PO says ${formatMoney(order.totalCost)}`}
          </p>
        </div>

        <div className="overflow-x-auto rounded border border-line" role="region" tabIndex={0} aria-label="Line items, scrolls sideways">
          <table className="w-full min-w-[60rem] text-sm">
            <thead className="bg-subtle text-left">
              <tr>
                <th className="label px-3 py-3">Dept</th>
                <th className="label px-3 py-3">SKU / UPC</th>
                <th className="label px-3 py-3">Vendor part</th>
                <th className="label px-3 py-3">Description</th>
                <th className="label px-3 py-3 text-right">Retail</th>
                <th className="label px-3 py-3 text-right">Cost</th>
                <th className="label px-3 py-3 text-right">Ctns</th>
                <th className="label px-3 py-3 text-right">Cs pk</th>
                <th className="label px-3 py-3 text-right">Ext qty</th>
                <th className="label px-3 py-3 text-right">Ext cost</th>
                <th className="label px-3 py-3 text-right">Kg</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => (
                <tr key={l.sku} className="border-t border-line">
                  <td className="num px-3 py-2.5">{l.dept}</td>
                  <td className="num px-3 py-2.5">
                    <span className="block">{l.sku}</span>
                    <span className="block text-xs text-muted">{l.upc}</span>
                  </td>
                  <td className="num px-3 py-2.5">{l.vendorPart}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{l.description}</td>
                  <td className="num px-3 py-2.5 text-right">{formatMoney(l.retail)}</td>
                  <td className="num px-3 py-2.5 text-right">{formatUnitCost(l.cost)}</td>
                  <td className="num px-3 py-2.5 text-right">{formatCount(l.cartons)}</td>
                  <td className="num px-3 py-2.5 text-right">{l.casePack}</td>
                  <td className="num px-3 py-2.5 text-right">{formatCount(l.extQty)}</td>
                  <td className="num px-3 py-2.5 text-right">{formatMoney(l.extCost)}</td>
                  <td className="num px-3 py-2.5 text-right">{l.kilograms.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-line-strong bg-subtle font-semibold">
              <tr>
                <td className="px-3 py-3" colSpan={6}>
                  Totals
                </td>
                <td className="num px-3 py-3 text-right">{formatCount(totals.cartons)}</td>
                <td />
                <td className="num px-3 py-3 text-right">{formatCount(totals.extQty)}</td>
                <td className="num px-3 py-3 text-right" data-testid="lines-total">
                  {formatMoney(totals.extCost)}
                </td>
                <td className="num px-3 py-3 text-right">{totals.kilograms.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
