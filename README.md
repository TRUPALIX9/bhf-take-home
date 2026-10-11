# BHF take-home: Trupal Patel

Two parts, both about vendor purchase orders (POs):

| Part | Folder | Status |
|---|---|---|
| A. Next.js assessment (required) | [`nextjs-app/`](nextjs-app/README.md) | Done |
| B. Python PO parser (optional) | [`python-po-parser/`](python-po-parser/README.md) | Done |
| The brief and its sample files | [`technical-assessment/`](technical-assessment/README.md) | Requirement → code → test map, original sample PO and template |

This page has everything needed to run, review and judge both parts. Each folder's README goes into more detail.

![PO Review dashboard](docs/screenshots/list.png)

## Quick start

Requires Node.js 20+ and Python 3.11+.

```bash
scripts/setup.sh              # install both parts (add --browser for Playwright's Chromium)
scripts/dev.sh                # Part A at http://localhost:3000
scripts/parse-po.sh           # Part B: sample PO -> python-po-parser/output/purchase_order_sample.xlsx
scripts/check.sh              # every check for both parts, the same one CI runs
```

## Part A: Next.js PO review app

A small internal dashboard where a buyer reviews vendor POs and approves them or sends them back for correction. Next.js 15.5 (App Router), React 19, TypeScript, Tailwind v4. No database, auth or UI library.

### The brief, and where each part is

| Requirement | Where | What it does |
|---|---|---|
| Next 15, App Router, TypeScript, Tailwind | `nextjs-app/package.json`, `app/` | Next pinned to 15.5. |
| Server-rendered list | `app/page.tsx` → `components/OrdersTable.tsx` | Async Server Components read the POs on the server; the rows are in the HTML, with no client fetching. |
| Dynamic route | `app/orders/[poNumber]/page.tsx` | One PO laid out like the printed document. An unknown PO number returns a real 404. |
| Server action | `app/actions.ts` | `setReviewStatus` validates the PO, the status and the note, saves, and revalidates the list and the PO page. |
| README | `nextjs-app/README.md` and this page | How to run, the action and route, assumptions, time spent. |

### What it does beyond the brief

- **Review workflow.** Pending review → **Approve** or **Request correction** (note required). Needs correction → **Corrected PO received** → back to review. Approved → **Revoke approval**. Every step asks for confirmation; the badge updates at once (`useOptimistic`) and rolls back if saving fails.
- **Seven plain-language checks** on every PO (unit counts, line costs, empty lines, cost at or above retail, lines adding up to the total, repeated items, ship date before PO date). Problems show in red with the numbers and what to do; the ⓘ beside the status lists everything that was checked.
- **List page:** search (by PO, vendor, port, country, or anything on the lines), a status menu with counts, and a Filters panel (master PO; origin country > vendor as a tree). Options only show when they return results. POs are grouped under their master PO, sortable by ship date or total, and **paged on the server** (10 / 25 / 50 rows). Every view is a URL.
- **PO page:** line-item search, sort by line cost or units, header tooltips that spell out each abbreviation, and a **kg · m³ / lb · ft³** switch for weight and volume.
- **Loading and errors.** Only the part that changes reloads (keyed `<Suspense>` with skeletons). Every error has a code (PO-400, PO-404, PO-422, PO-500, PO-501, APP-500, APP-503) and three error boundaries.
- **Works at 375 px**: the table becomes grouped cards.

### Assumptions (Part A)

- **Review status lives in memory**, seeded from `nextjs-app/data/orders.json`. It survives hot reload and resets when the server restarts. A database would replace `lib/orders.ts` and nothing else.
- **Pages render per request** (`force-dynamic`) because status changes at runtime.
- **No sign-in**; anyone with the app can approve.
- **The action sets a status, never toggles one**, so double clicks and stale tabs can't undo a decision.
- **Seed data:** TX9K2QP is the real sample PO, produced by Part B's `--json` export. The other three POs are made up so the list has something to compare.
- **Units:** the PO's KILOGRAMS column is read as kilograms per carton (the PO doesn't say per what; 7.72 kg fits one carton of two comforters). CUBE has no printed unit; it is read as cubic metres per carton (0.0991 m³ is a carton about 46 cm a side), not an area.
- **No UPC check-digit rule:** the sample's UPCs don't have valid check digits, so it would flag every line.

## Part B: Python PO parser

`python-po-parser/po_extract.py` reads `input/purchase_order_sample.txt`, checks its math, and writes one row per SKU into a copy of the template `input/output_template_blank.xlsx`, in the template's own column order. The result is committed at `python-po-parser/output/purchase_order_sample.xlsx`.

- **Parsing:** named regexes for the header fields; the side-by-side SHIP TO / BILL TO block is split at the BILL TO column; item rows are matched by one anchored regex, with the UPC on the next line. Any line it can't read raises an error naming the line, so nothing is dropped silently.
- **Validation (in `Decimal`, exact):** per row, EXT QTY = CTNS × CSPK and EXT COST = COST × EXT QTY; across the order, the TOTALS line must equal the sums of EXT COST, CTNS, EXT QTY and KILOGRAMS. A failing cell gets a red fill and a comment; every flag is also printed.
- **Exit codes:** 0 written and clean, 1 written with flags, 2 input couldn't be processed (always a one-line `error:`, never a traceback).
- **Result on the sample:** 12 rows, totals EXT COST 447,455.12, CTNS 3,475, EXT QTY 6,950, KG 119.18; **0 flags**.
- **Assumptions:** Total Cost is the PO grand total repeated on every row; SHIP DATE `5/02/26` is M/D/YY (May 2, 2026); addresses stay multi-line in one cell; IDs (UPC, part numbers) are written as text to keep leading zeros.

```bash
scripts/parse-po.sh --json    # also writes output/TX9K2QP.json, the seed for Part A
```

## Tests

`scripts/check.sh` runs all of this, and CI (`.github/workflows/check.yml`) runs it on every push:

- **Part A:** ESLint, TypeScript, Vitest unit tests for `lib/` (data, checks, filters, sorting, paging, units, and malformed input to the server action), a production build, and Playwright end-to-end tests on desktop Chrome and a 375 px phone (approve and correction flows, filters, search, paging, units, 404, the error boundary, no sideways scroll).
- **Part B:** ruff, pytest (parsing, every check firing on tampered text, a missing / empty / binary / malformed input, a broken template, an unwritable output), and a run on the sample that must produce 0 flags.

Set `PW_CHANNEL=chrome` to run the browser tests on an installed Google Chrome instead of downloading Chromium.

## Repository layout

```
bhf-take-home/
├── technical-assessment/   what BHF asked for: requirement map, sample PO, output template
├── nextjs-app/             Part A: Next.js 15 PO review app (own README and CLAUDE.md)
├── python-po-parser/       Part B: PO text → spreadsheet script (own README and CLAUDE.md)
├── docs/
│   ├── DESIGN.md           system overview, lifecycles, flows (Mermaid diagrams)
│   └── screenshots/        README images, regenerated by `npm run screenshots`
├── scripts/                setup.sh, dev.sh, parse-po.sh, check.sh (all take --help)
├── .github/workflows/      CI: runs scripts/check.sh on every push
├── .claude/                Claude Code reviewer agent and /check skill
└── CLAUDE.md               shared instructions for the AI assistant
```

The two parts don't import from each other. The only link is data: Part B's JSON for the sample PO is Part A's seed for TX9K2QP.

## Scripts

Every script works from any folder and prints its options with `--help`.

| Script | What it does | Options |
|---|---|---|
| `setup.sh` | `npm ci` for the app, `pip install` for the parser | `--browser`, `--next-only`, `--python-only` |
| `dev.sh` | Starts the Next.js dev server, or builds and starts production | `--slow`, `--prod`, `--port <n>` |
| `parse-po.sh` | Runs `po_extract.py`; exit code 1 if anything is flagged | `--input`, `--output`, `--template`, `--json` |
| `check.sh` | Originals match, then lint, typecheck, unit tests, build, e2e; ruff, pytest, a run on the sample | `--next`, `--python`, `--no-e2e` |

Design notes and diagrams: [`docs/DESIGN.md`](docs/DESIGN.md).

## With more time

- Store review status in Postgres or SQLite, and record who decided and when; add sign-in.
- Show Part B's validation flags on the PO page.
- Run the parser over more real POs before loosening it; batch mode for a folder of POs.

## AI use

Built with Claude Code. The instruction files it used are committed unchanged: [`CLAUDE.md`](CLAUDE.md), [`nextjs-app/CLAUDE.md`](nextjs-app/CLAUDE.md), [`python-po-parser/CLAUDE.md`](python-po-parser/CLAUDE.md), plus one review subagent ([`.claude/agents/brief-reviewer.md`](.claude/agents/brief-reviewer.md)) and one skill that runs the checks ([`.claude/skills/check/SKILL.md`](.claude/skills/check/SKILL.md)).

## Time spent

About 1 hour in total for both parts, working with Claude Code (see AI use above).
