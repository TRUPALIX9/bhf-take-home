# nextjs-app

Next.js 15.5 App Router, React 19, TypeScript, Tailwind v4. Scaffolded with:

```
npx create-next-app@15 . --ts --tailwind --eslint --app --no-src-dir --turbopack --import-alias "@/*" --use-npm --disable-git --yes
```

## Layout rules

- `app/` holds routes only. `app/actions.ts` holds the one server action (`"use server"`).
- `lib/orders.ts` is the only module that reads or changes data. It starts with `import "server-only"`.
- `components/ui/` holds the shared pieces (`Button`, `Badge`, `Card`, `Th`/`Td`, `Spinner`). Build new UI from these and the `@theme` tokens; no one-off colors, paddings or button styles.
- `components/` holds feature components. Client components: `ReviewPanel`, `StatusTabs`, `ErrorState`. Everything else is a Server Component.
- `data/orders.json` is seed data. It is read once and never written.

## Next 15 rules

- `params` is a Promise: `const { poNumber } = await params`. Same in `generateMetadata`.
- Unknown PO: call `notFound()`.
- Both pages export `dynamic = "force-dynamic"` because review status changes at runtime. No `generateStaticParams`.
- The action validates the PO number and the requested status, calls `setStatus` (sets, never flips, so it is idempotent), then `revalidatePath("/")` and `revalidatePath(`/orders/${po}`)`.
- Pending state comes from `useActionState` (from `react`), not `useFormState`. `ReviewPanel` also uses `useOptimistic` so the badge and step tracker change before the server answers; React rolls them back if the action returns an error.

## State

Data access is async (`await getOrders()`), like a database call. Review status lives in a `Map` on `globalThis` (survives dev hot reload, resets on server restart). This is a stated assumption in the README, not a bug.

## UI

- Product dashboard style: white surfaces, grey hairline borders, sentence-case labels, no decorative type. The one accent is BHF's slate blue from britannicahome.com.
- Fonts via `next/font/google`: IBM Plex Sans (400/500/600) for everything, IBM Plex Mono (400/500) for PO numbers, SKUs, UPCs and vendor part numbers.
- Base text 14px. Scale: 12 / 14 / 16 / 24 px. Spacing on a 4px grid. Radius 6–8px on cards, full on pills.
- Colors are `@theme` tokens in `globals.css`: surface `#FFFFFF`, inverse `#FFFFFF` (text on filled colors), ink `#1B2330`, muted `#5D6C7B`, line `#E4E9EF`, subtle `#F6F8FA`, accent `#154B98`; Pending `#8A5300` on `#FDF3E1`, Approved `#1F6B45` on `#E4F3EA`, danger `#B42318`. No literal colors in components. Every text pair is at least 4.5:1.
- Numbers use `tabular-nums` and are right-aligned in tables. Money via `Intl.NumberFormat`; unit cost keeps 3 decimals.
- Wordmark is text ("BHF" with a "B" tile). Do not copy BHF's logo. Seed POs use made-up brands.
- Must work at 375px wide: stat cards go 2-up, the list becomes stacked rows, the line-item table scrolls in its own box.
- Buttons are at least 44px tall, have a visible focus ring, and say what they do.

## Loading, errors and flow

- Pages render their heading at once and wrap the data part in `<Suspense>` with a skeleton from `components/Skeletons.tsx`. No `loading.tsx`: it would stream a 200 before `notFound()` runs. The detail page calls `orderExists()` before any streaming for that reason.
- `npm run dev:slow` sets `SIMULATED_LATENCY_MS=1200` so skeletons and the button spinner are visible.
- `FAIL_PO=<po>` makes `getOrder` throw for that PO. Playwright sets it to `TX9K5DC` to test the error boundary. Never set it anywhere else.
- Every user-facing error has a code and a plain message in `lib/errors.ts` (PO-400, PO-404, PO-500, PO-501, APP-500, APP-503). Boundaries: `app/global-error.tsx` (root layout), `app/error.tsx` (any page), `app/orders/[poNumber]/error.tsx` (one PO). All use `components/ErrorState.tsx`, which logs the error and shows the code and Next's digest.
- The server action never throws to the client: it returns `{ error: AppError }`, shown under the button.
- `components/ProcessSteps.tsx` shows where a PO is: Received → Parsed and checked → Review → Ready for downstream. The current step pulses (only when motion is allowed).

## Quality bar (check before submitting)

- Lighthouse on `npm run build && npm start`: Accessibility 100, Best Practices 100, Performance 90+. Last measured: `/` 98/100/100, `/orders/TX9K2QP` 97/100/100.
- `next build` reports about 120 kB First Load JS per route, almost all of it Next.js and React. Don't add client libraries without a reason.
- No console errors or hydration warnings. Tab through the list and detail page with the keyboard only.

## Tests

- Vitest: unit tests for `lib/` (`npm test`).
- Playwright: end-to-end tests in `e2e/` against the production build (`npm run test:e2e`). Every test runs twice: desktop Chrome and a 375px phone. They cover list → detail → approve → status persists on both pages → unknown PO shows 404 → a failing PO shows the error boundary.
- The action stays a thin wrapper; Playwright covers it end to end.
