# PO Review (Next.js assessment)

A small internal dashboard for reviewing vendor purchase orders. The list of POs is rendered on the server. Each PO has a detail page with its line items and where it is in the review flow. A server action approves a PO or moves it back to review.

![Purchase order list](../docs/screenshots/list.png)

| PO detail | Approved | Phone |
|---|---|---|
| ![PO detail](../docs/screenshots/detail.png) | ![Approve confirmation](../docs/screenshots/confirm.png) ![What was checked (i)](../docs/screenshots/checks-info.png) ![Error page with code](../docs/screenshots/error.png) | ![Phone layout](../docs/screenshots/mobile.png) |

## Run it

Requires Node 20 or newer. Built and tested on Node 26; CI runs on Node 22.

```bash
npm install
npm run dev          # http://localhost:3000
npm run dev:slow     # same, with 1.2 s simulated latency so loading states are visible
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
npx playwright install chromium   # first time only (or prefix the next line with PW_CHANNEL=chrome to use installed Chrome)
npm run test:e2e     # Playwright: builds, starts on :3100, runs desktop + 375px phone
npm run screenshots  # regenerates the images in ../docs/screenshots
```

## The brief, and where each part is

| Requirement | Where | What it does |
|---|---|---|
| Next 15, App Router, TypeScript, Tailwind | `package.json`, `app/` | Next 15.5, React 19, Tailwind v4. |
| Server-rendered list | `app/page.tsx` → `components/OrdersTable.tsx` | Async Server Components read the POs from `lib/orders.ts`. No client-side fetching; the data is in the HTML. |
| Dynamic route | `app/orders/[poNumber]/page.tsx` → `components/OrderDetail.tsx` | One PO: header, addresses, every line item with SKU, UPC and totals. Unknown PO numbers call `notFound()` and return a real 404. |
| Server action | `app/actions.ts` | `setReviewStatus` moves a PO between **Pending review**, **Approved** and **Needs correction** (with a note). The dialog sends the status it wants; the action checks the PO, the status and the note, saves it, and revalidates the list and the detail page. |
| README | this file | How to run, what the action and route do, assumptions, time spent. |

## Beyond the brief

Everything below is extra. The brief's five requirements are complete without it.

- **A realistic review workflow, every step confirmed.** Pending review → **Approve** (released downstream) or **Request correction** with a required note; Needs correction → **Corrected PO received** → back to review; Approved → **Revoke approval**. Each step opens a dialog showing the PO, vendor and total before anything changes. The badge and buttons update at once (`useOptimistic`) and roll back if saving fails.
- **Plain-language checks.** Seven checks run on every PO (`lib/checks.ts`): unit counts, line costs, empty lines, cost at or above retail, lines adding up to the total, repeated items, ship date before PO date. Problems appear in red with the numbers and what to do, and pre-fill the correction note. When nothing is wrong, nothing is shown; the ⓘ button beside the status lists what was checked.
- **List page: search, status, filters, in that order.** A search box finds POs by number, vendor, master PO, port or country, or anything on their lines (SKU, UPC, part, description). Next to it, a **Status** menu ("Status: Pending review 3 ▾") lists each status with its color and count. Then **Filters**: a tree of origin country > vendor (tick a country for everything from there, or single vendors) and a master PO list. Every group only offers options that return POs, with live counts, and active filters show as one chip per group ("Origin & vendor (2) ▾"). "Showing N of 4 purchase orders" sits under the toolbar. Everything is in the URL, so every view is a shareable link (`lib/filters.ts`).
- **PO page search.** A search box above the line items narrows them by SKU, UPC, part or description ("2 of 12 lines"); the totals stay those of the whole PO.
- **Hierarchy: master PO → PO.** The table groups POs under their master PO (the printed "REF MASTER PO#"). Each group shows its PO count, statuses and total value, and can be collapsed. The PO page breadcrumb follows the same path, and "Ref master PO" on the document opens the list filtered to that master.
- **Sorting where it helps.** Ship date (the default, earliest first) and total cost sort, on the server from the URL; status, vendor and origin are filters instead. On a PO page, line items sort by ext cost or ext qty and return to the printed order. The whole row opens the PO. An empty filter result shows a friendly animated message ("No POs waiting for review. All caught up.").
- **Detail page: the review on top, the PO as a document below.** Top: one card with the PO number, status, the ⓘ check details, the next actions, and any problems found. Below: the purchase order laid out like the printed one a buyer or vendor knows: issuer and "PURCHASE ORDER" header, Vendor / Ship to / Bill to blocks, a terms strip (PO date, ship date, ship terms, ref master PO), the line items in the PO's own column order (ext cost and ext qty sort), and totals at the bottom right ending in the total invoice value.
- **Only what changes reloads.** The toolbar and the table are separate `<Suspense>` parts; only the table is keyed by the filters and sort, so changing them reloads only the rows. React's `cache()` makes them share one data read per request.
- **Loading states.** The heading renders at once and each part streams in behind an animated skeleton (`components/Skeletons.tsx`).
- **Errors with codes.** Every error a person can see has a code and a plain message in `lib/errors.ts`, e.g. *PO-404 PO not found*, *PO-400 Status not recognised*, *PO-501 Status not saved*. Three error boundaries: the root layout (`global-error.tsx`), any page (`error.tsx`) and one PO (`orders/[poNumber]/error.tsx`). In production Next hides the real message, so the page also shows Next's error reference, which matches the server log.
- **Design system.** Shared tokens and five small UI pieces (below).
- **Tests and CI.** Vitest, Playwright on desktop and phone, and a GitHub Actions workflow.

## Design system

The look is a plain product dashboard: white cards, hairline borders, IBM Plex Sans, and IBM Plex Mono for codes (PO numbers, SKUs, UPCs). The one accent is the slate blue from Britannica Home Fashions' site, britannicahome.com.

![Color tokens](../docs/screenshots/palette.png)

All colors are `@theme` tokens in `app/globals.css`, so Tailwind classes like `text-muted` or `bg-pending-bg` use them. The image above is generated from those tokens by `npm run screenshots`.

| Text on background | Contrast (WCAG AA needs 4.5) |
|---|---|
| ink on white | 15.8 |
| muted on white / on subtle | 5.4 / 5.1 |
| accent on white, white on accent | 8.4 |
| pending on pending-bg | 5.8 |
| approved on approved-bg | 5.6 |
| danger on white | 6.6 |

UI pieces in `components/ui/`, used everywhere instead of one-off styles:

| Piece | Used for |
|---|---|
| `Button`, `linkClass` | Approve / Move back, Try again, text links. 44 px tall, visible focus ring. While saving it shows a spinner and ignores clicks but keeps keyboard focus. |
| `Badge` | Status pills (pending, approved) and tab counts (accent, neutral). Color changes fade. |
| `Card` | Shared container style (white, hairline border, soft shadow). |
| `Th`, `Td` | Every table cell: one padding rule, numbers right-aligned with tabular digits. |
| `Spinner` | Button and tab loading indicators. |

Motion is short (200–500 ms) and every animation is wrapped in `motion-safe:`, so it is off for people who ask their system for reduced motion.

**Measured** with Lighthouse on the production build: `/` scores Performance 98, Accessibility 100, Best Practices 100; `/orders/TX9K2QP` scores 97, 100, 100. First Load JS is about 120 kB per page, most of it Next.js and React themselves.

## File map

```
app/
  layout.tsx                    fonts, header
  globals.css                   color, font and motion tokens
  page.tsx                      list page: heading + two <Suspense> parts
  actions.ts                    "use server" setReviewStatus
  error.tsx, global-error.tsx   error boundaries
  orders/[poNumber]/
    page.tsx                    404 check, breadcrumb + <Suspense>
    not-found.tsx               PO-404
    error.tsx                   PO-500
components/
  ui/                           Button, Badge, Card, Th/Td, Spinner
  OrdersToolbar.tsx             search, status, Filters, result count (server)
  FiltersMenu.tsx               the Filters panel and chips (client)
  MasterGroup.tsx               collapsible master PO group (client)
  OrdersTable.tsx               rows for the current filter (server)
  StatusSelect.tsx              status menu with colors, meanings and counts (client)
  SearchBox.tsx                 search box kept in the URL (client)
  OrderDetail.tsx               review panel + checks + PO document (server)
  PurchaseOrderDocument.tsx     the PO laid out like the printed document
  ReviewPanel.tsx               title, status, actions, confirmation dialogs (client, optimistic)
  ChecksInfo.tsx                the ⓘ panel: what was checked
  ReviewChecks.tsx              problems found, in red, with what to do
  Skeletons.tsx                 loading placeholders
  StatusBadge.tsx, ErrorCard.tsx, ErrorState.tsx
lib/
  types.ts                      Order, LineItem, ReviewStatus
  orders.ts                     the only module that reads or changes data
  errors.ts                     error codes and messages
  checks.ts                     the seven checks, in plain words, with fixes
  filters.ts                    status + facets: URL parsing, matching, facet options
  sort.ts                       sortable columns and list URLs
  origin.ts                     port and country from the ship terms
  format.ts                     money, dates, totals
data/orders.json                seed data
e2e/                            Playwright tests and the screenshot script
```

## Data

`data/orders.json` holds four POs.

- **TX9K2QP** is the real sample PO from the Python assessment. It was produced by `python-po-parser/po_extract.py --json` and copied here unchanged.
- **TX9K3RA, TX9K4MB, TX9K5DC** are made up, with invented vendors and brands, so the list has something to compare. Their line math is consistent (cartons × case pack = quantity, cost × quantity = extended cost).

## Assumptions

- **Status is kept in memory.** It starts from the JSON file and lives in a `Map` on `globalThis`, so it survives hot reloads in dev but **resets when the server restarts**. With several serverless instances (e.g. Vercel) each would have its own copy. A database would replace `lib/orders.ts` and nothing else.
- **Pages render on every request** (`dynamic = "force-dynamic"`) because status changes at runtime. Without it, Next prerenders `/` at build time and the new status would not show.
- **No authentication.** Anyone who can open the app can approve a PO.
- **The action sets a status; it never flips one.** The form sends `status=approved` or `status=pending`, so it is idempotent: clicking twice, clicking from an out-of-date tab, or two reviewers at once can't turn an approval back into "pending". The last write wins; a real system would also check a version number.
- **The status applies to the whole PO.** Approving individual lines was out of scope.
- **No barcode check-digit check.** The sample PO's UPCs don't have valid check digits (the data is illustrative), so that rule would flag every line. It's the first check to add for real data.
- **Light theme only.**
- **Skeletons use `<Suspense>`, not `loading.tsx`.** A `loading.tsx` streams the response with status 200 before the page runs, which turned the unknown-PO page into a 200 instead of a 404 (an e2e test caught this). The detail page checks the PO exists before anything streams.
- **Known `npm audit` advisories, all in tools that never reach the browser or the server at runtime:**
  - `postcss` inside Next.js 15: build-time only; the only fix is Next 16, which the brief rules out.
  - `eslint-config-next` → `micromatch`/`braces`: lint-time only; the suggested "fix" downgrades to Next 14's config.
  - `vitest`: affects its UI server and browser mode, which this project doesn't use; the fix is Vitest 5, which conflicts with the Node 20 types.
  - `@playwright/test` was upgraded to 1.55.1 to clear its advisory.
- **Two test-only switches** in `lib/orders.ts`, both off by default: `SIMULATED_LATENCY_MS` (used by `npm run dev:slow`) and `FAIL_PO` (Playwright sets it so one PO fails to load and the error boundary can be tested).

## Tests

- **Unit (Vitest, 61 tests):** order lookup and sort order, unknown PO, set both ways, setting is idempotent, a change affects only one PO, an unknown PO is rejected and nothing changes, only the two real statuses are accepted, every PO's lines add up to its total, the seed data has every field with the right type and no duplicate PO numbers, money, date, phone and name formatting, each of the seven checks catching a tampered PO in plain words, the correction note, sorting (including junk in the URL), and faceted filtering (OR inside a facet, AND across, options limited to what returns results).
- **Malformed input to the server action (Vitest, in the 61):** no fields, an unknown PO, a path in the PO number, a file instead of text, a missing status, an unknown status, the wrong case, and a script tag. Each returns PO-404 or PO-400 and changes nothing.
- **End to end (Playwright, 22 tests on desktop and a 375 px phone; a few desktop-only):** the raw HTML already contains the PO data (server rendering); list → detail shows 12 lines and $447,455.12; Approve asks for confirmation, Cancel changes nothing, the approval survives a reload and is counted on the list; requesting a correction requires a note, shows it, and "Corrected PO received" returns it to review; Revoke approval asks for confirmation; a decision from an out-of-date tab can't undo another; the ⓘ panel lists the checks; the status menu filters the list; searching the list by what is on a PO, and a PO's lines by SKU or description; sorting a column and reversing it; line items sort and return to printed order; the Filters panel offers only matching options and Select all / Clear all work; a whole row opens its PO; an empty tab shows its message; master PO groups collapse; Ref master PO and the breadcrumb lead to the master PO view; `/orders/NOPE` returns 404 with code PO-404; a PO that fails to load shows the PO-500 error page; no sideways page scroll.

## With more time

- Persist status in SQLite or Postgres, and record who approved and when.
- Search by PO number or vendor.
- Show the Python validation flags on the detail page.
- Sign-in, so approvals are tied to a person.

## Time spent

About 1 hour in total for both parts, working with Claude Code. See the [root README](../README.md).

## AI use

Built with Claude Code. Its instruction files are committed unchanged: [`../CLAUDE.md`](../CLAUDE.md) and [`CLAUDE.md`](CLAUDE.md).
