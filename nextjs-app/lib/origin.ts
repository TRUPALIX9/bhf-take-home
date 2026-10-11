/**
 * Where a PO ships from, read from its ship terms ("FOB Ningbo,CHN").
 * Pure functions, safe on server and client. Used by the origin filter and the table.
 */
import type { Order } from "@/lib/types";

// Country codes as printed on the POs, with names people recognize.
const countryNames: Record<string, string> = { CHN: "China", PAK: "Pakistan", IND: "India", VNM: "Vietnam" };

/** "FOB Ningbo,CHN" -> { port: "Ningbo", country: "CHN" }. Terms without a comma have no country. */
export function originOf(order: Order): { port: string; country?: string } {
  const place = order.shipTerms.replace(/^[A-Z]{3}\s+/, ""); // drop the Incoterm, e.g. "FOB "
  const [port, country] = place.split(",").map((s) => s.trim());
  return { port, country: country || undefined };
}

/** "CHN" -> "China"; unknown codes are shown as they are. */
export const countryName = (code: string) => countryNames[code] ?? code;


/** Countries in the list with their ports and PO counts, most orders first. */
export function originSummary(orders: Order[]) {
  const byCountry = new Map<string, { ports: Set<string>; count: number }>();
  for (const o of orders) {
    const { port, country } = originOf(o);
    if (!country) continue;
    const entry = byCountry.get(country) ?? { ports: new Set<string>(), count: 0 };
    entry.ports.add(port);
    entry.count += 1;
    byCountry.set(country, entry);
  }
  return [...byCountry]
    .map(([code, { ports, count }]) => ({ code, name: countryName(code), ports: [...ports], count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
