# PO Review (Next.js assessment)

A small internal dashboard for reviewing vendor purchase orders. The list of POs is rendered on the server, each PO has a detail page with its line items and where it is in the review flow, and a server action approves a PO or moves it back to review.

The look is a plain product dashboard (IBM Plex Sans, white cards, hairline borders) using Britannica Home Fashions' slate blue from britannicahome.com as the one accent.

## Run it

Requires Node 20 or newer (tested on Node 22 and 26).

```bash
npm install
npm run dev          # http://localhost:3000
npm run dev:slow     # same, with 1.2s simulated latency so loading skeletons are visible
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
npx playwright install chromium   # first time only (or set PW_CHANNEL=chrome to use installed Chrome)
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

Also included:

- **Dashboard view.** Stat cards (pending, approved, total on order, next to ship) and status tabs that filter the list through the URL (`/?status=pending`).
- **Process flow.** Each PO shows Received → Parsed and checked → Review → Ready for downstream, with the current step highlighted.
- **Loading only what changes.** The list page has two `<Suspense>` boundaries. The summary (stat cards, tab counts) doesn't depend on the filter, so it stays on screen when you switch tabs. Only the table, keyed by the filter, reloads. The clicked tab highlights immediately (`useOptimistic` + `router.push` in one transition) with a small spinner until the new rows arrive. Both parts read the data through React's `cache()`, so one request reads it once.
- **Loading states.** On first load the heading renders at once and each part streams in behind its own animated skeleton. The Approve button shows a spinner while the action runs; the rest of the page stays as it is and updates in place when the action revalidates.
- **Errors with codes.** Every error a person can see has a code and a plain message (`lib/errors.ts`), e.g. *PO-404 PO not found* or *PO-501 Status not saved*. There are three error boundaries: the whole app (`global-error.tsx`), any page (`error.tsx`) and one PO (`orders/[poNumber]/error.tsx`). In production Next hides the real message, so the page also shows Next's error reference, which matches the server log.
- A check on the detail page that the line items add up to the PO total.

## File map

```
app/
  layout.tsx                    fonts, header
  page.tsx                      list page: heading + two <Suspense> parts
  actions.ts                    "use server" toggleReviewStatus
  error.tsx, global-error.tsx   error boundaries
  orders/[poNumber]/
    page.tsx                    404 check, breadcrumb + <Suspense>
    not-found.tsx               PO-404
    error.tsx                   PO-500
components/
  OrdersSummary.tsx             stat cards + tab counts (server)
  OrdersTable.tsx               rows for the current filter (server)
  StatusTabs.tsx                tabs, instant highlight (client)
  OrderDetail.tsx               flow, stats, line items, details (server)
  ProcessSteps.tsx              Received → … → Ready for downstream
  Skeletons.tsx                 loading placeholders
  StatCard.tsx, StatusBadge.tsx
  ToggleStatusButton.tsx        form + pending state (client)
  ErrorState.tsx                shared error body (client)
lib/
  types.ts                      Order, LineItem, ReviewStatus
  orders.ts                     the only module that reads or changes data
  errors.ts                     error codes and messages
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
- **Skeletons use `<Suspense>`, not `loading.tsx`.** A `loading.tsx` streams the response with status 200 before the page runs, which turned the unknown-PO page into a 200 instead of a 404 (the e2e test caught this). The detail page checks the PO exists before anything streams.
- **Simulated latency is off by default.** The data is in memory, so skeletons only flash; `npm run dev:slow` makes them visible.

## Tests

- **Unit (Vitest, 10 tests):** order lookup and sort order, unknown PO, toggle both ways, toggle affects only one PO, unknown PO toggle throws and changes nothing, every PO's lines add up to its total, money/date formatting.
- **End to end (Playwright, desktop and a 375px phone):** raw HTML already contains the PO data (server rendering); list → detail shows 12 lines and $447,455.12; Approve → status changes, survives reload, approved count goes up, then moves back; status tabs filter the list; `/orders/NOPE` returns 404 with code PO-404; no sideways page scroll.
- **Error boundaries** were checked by hand: throwing inside `OrderDetail` shows *PO-500 This purchase order could not load* with a reference, Try again and a link back.

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
