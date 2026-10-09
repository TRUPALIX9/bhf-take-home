# nextjs-app

Next.js 15.5 App Router, React 19, TypeScript, Tailwind v4. Scaffolded with:

```
npx create-next-app@15 . --ts --tailwind --eslint --app --no-src-dir --turbopack --import-alias "@/*" --use-npm --disable-git --yes
```

## Layout rules

- `app/` holds routes only. `app/actions.ts` holds the one server action (`"use server"`).
- `lib/orders.ts` is the only module that reads or changes data. It starts with `import "server-only"`.
- `components/` holds UI pieces. Only `ToggleStatusButton.tsx` is a client component.
- `data/orders.json` is seed data. It is read once and never written.

## Next 15 rules

- `params` is a Promise: `const { poNumber } = await params`. Same in `generateMetadata`.
- Unknown PO: call `notFound()`.
- Both pages export `dynamic = "force-dynamic"` because review status changes at runtime. No `generateStaticParams`.
- The action validates the PO number, calls `toggleStatus`, then `revalidatePath("/")` and `revalidatePath(`/orders/${po}`)`.
- Pending state comes from `useActionState` (from `react`), not `useFormState`.

## State

Review status lives in a `Map` on `globalThis` (survives dev hot reload, resets on server restart). This is a stated assumption in the README, not a bug.

## UI (follows Britannica Home Fashions' own site, britannicahome.com)

- Fonts via `next/font/google`, replacing the scaffold's Geist:
  - Bodoni Moda (500/600): wordmark and page titles only. BHF uses it for its display headings.
  - Montserrat (400/500/600): all UI text and uppercase labels. Free stand-in for Gotham, BHF's label face.
  - IBM Plex Mono (400/500): PO#, SKU, UPC and money.
- All numbers use `tabular-nums` and are right-aligned in tables. Money: `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`; unit cost keeps 3 decimals.
- Colors are CSS variables in `globals.css`, exposed to Tailwind with `@theme`. Black-and-white base like BHF's site, with their slate blue as the one accent:
  bg `#FFFFFF`, subtle `#F5F7FA`, ink `#222222`, muted `#5D6C7B`, line `#E4EBF3`, accent `#154B98`;
  Pending `#8A5300` on `#FDF3E1`, Approved `#1F6B45` on `#E4F3EA`. Every text pair is at least 4.5:1.
- Wordmark is plain text ("BHF" in Bodoni Moda + "PO Review"). Do not copy BHF's logo file.
- Seed POs use made-up brand names (like NORDPEAK in the sample), never BHF's real licensed brands.
- Type scale: 12 / 14 / 16 / 20 / 28 / 36 px. Spacing on a 4px grid. Radius 4px on tables, full on status pills. Uppercase labels get 0.08em letter-spacing.
- Light theme only. No gradients, emoji or decorative icons.
- Must work at 375px wide. On small screens the list becomes stacked rows, and the line-item table scrolls inside its own container.
- Buttons are at least 44px tall, show a visible focus ring, and say what they do ("Approve", "Move back to review").

## Quality bar (check before submitting)

- Lighthouse on `npm run build && npm start`: Accessibility 100, Best Practices 100, Performance 90+.
- `next build` output: First Load JS for `/` under 120 kB.
- No console errors or hydration warnings. Tab through the list and detail page with the keyboard only.

## Tests

- Vitest: unit tests for `lib/` (`npm test`).
- Playwright: end-to-end tests in `e2e/` against the production build (`npm run test:e2e`). They cover list → detail → approve → status persists on both pages → unknown PO shows 404, plus one run at 375px width.
- The action stays a thin wrapper; Playwright covers it end to end.
