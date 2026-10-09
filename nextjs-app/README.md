# PO Review (Next.js assessment)

A small internal tool for reviewing vendor purchase orders. The list of POs is rendered on the server, each PO has a detail page with its line items, and a server action approves a PO or moves it back to review.

The look follows Britannica Home Fashions' own site (britannicahome.com): black and white, one slate-blue accent, Bodoni Moda for titles.

## Run it

Requires Node 20 or newer (tested on Node 22 and 26).

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

Checks:

```bash
npm run lint
npx tsc --noEmit
npm test             # Vitest unit tests for lib/
npx playwright install chromium   # first time only
npm run test:e2e     # Playwright: builds, starts on :3100, runs desktop + mobile
```

## What's here

| Requirement | Where | What it does |
|---|---|---|
| Next 15, App Router, TypeScript, Tailwind | `package.json`, `app/` | Next 15.5, React 19, Tailwind v4 |
| Server-rendered list | `app/page.tsx` | A Server Component reads all POs from `lib/orders.ts` and renders a table (stacked rows on phones). No client-side fetching. |
| Dynamic route | `app/orders/[poNumber]/page.tsx` | Shows one PO: dates, buyer, the three address blocks, and every line item with SKU, UPC and totals. Unknown PO numbers call `notFound()` and show `not-found.tsx` with a 404 status. |
| Server action | `app/actions.ts` | `toggleReviewStatus` moves a PO between **Pending review** and **Approved**. It checks the PO exists, updates it, and revalidates the list and detail pages so both show the new status. |
| Pending state | `components/ToggleStatusButton.tsx` | The only client component. `useActionState` disables the button and shows "Saving…" while the action runs. |

Also included: `loading.tsx` skeleton, `error.tsx` boundary, page titles per PO, and a check on the detail page that the line items add up to the PO total.

## File map

```
app/
  layout.tsx                    fonts, header
  page.tsx                      PO list (server)
  actions.ts                    "use server" toggleReviewStatus
  orders/[poNumber]/page.tsx    PO detail (server)
  orders/[poNumber]/not-found.tsx
  loading.tsx, error.tsx
components/
  StatusBadge.tsx               Pending review / Approved pill
  ToggleStatusButton.tsx        form + pending state (client)
lib/
  types.ts                      Order, LineItem, ReviewStatus
  orders.ts                     the only module that reads or changes data
  format.ts                     money, dates, totals
data/orders.json                seed data
e2e/orders.spec.ts              Playwright tests
```

## Data

`data/orders.json` holds four POs.

- **TX9K2QP** is the real sample PO from the Python assessment. It was produced by `python-po-parser/po_extract.py --json` and copied here unchanged.
- **TX9K3RA, TX9K4MB, TX9K5DC** are made up, with invented vendors and brands, so the list has something to compare. Their line math is consistent (cartons × case pack = quantity, cost × quantity = extended cost).

## Assumptions

- **Status is kept in memory.** It starts from the JSON file and lives in a `Map` on `globalThis`, so it survives hot reloads in dev but **resets when the server restarts**. With several serverless instances (e.g. Vercel) each would have its own copy. A database would replace `lib/orders.ts` and nothing else.
- **Pages render on every request** (`dynamic = "force-dynamic"`) because status changes at runtime. Without it, Next prerenders `/` at build time and the new status would not show.
- **No authentication.** Anyone who can open the app can approve a PO.
- **The action is a toggle** on the whole PO. Approving individual lines was out of scope.
- **Light theme only**, matching BHF's site.

## Tests

- **Unit (Vitest, 10 tests):** order lookup and sort order, unknown PO, toggle both ways, toggle affects only one PO, unknown PO toggle throws and changes nothing, every PO's lines add up to its total, money/date formatting.
- **End to end (Playwright, desktop and Pixel 7):** raw HTML already contains the PO data (server rendering); list → detail shows 12 lines and $447,455.12; Approve → status changes, survives reload, list summary updates, then moves back; `/orders/NOPE` returns 404; no sideways page scroll.

## With more time

- Persist status in SQLite or Postgres, and record who approved and when.
- Filter the list by status with `searchParams`; search by PO # or vendor.
- Optimistic status update with `useOptimistic`.
- Show the Python validation flags on the detail page.
- Sign-in, so approvals are tied to a person.

## Time spent

_TBD_

## AI use

Built with Claude Code. Its instruction files are committed unchanged: [`../CLAUDE.md`](../CLAUDE.md) and [`CLAUDE.md`](CLAUDE.md).
