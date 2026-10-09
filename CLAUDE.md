# CLAUDE.md

Instructions for Claude Code in this repo. Committed as-is, as the assessment asks.

## What this repo is

BHF take-home, two independent parts:

- `nextjs-app/` (required): Next.js 15 App Router + TypeScript + Tailwind. A purchase-order review app: server-rendered list, detail route, one server action.
- `python-po-parser/` (optional): one script that turns `input/purchase_order_sample.txt` into an `.xlsx` matching `input/output_template_blank.xlsx`, with math validation.

Each folder has its own README and CLAUDE.md. The folders do not import from each other. The only link is data: the parser's `--json` output is committed as the TX9K2QP entry in `nextjs-app/data/orders.json`.

## Rules

- YAGNI. Build only what the brief asks for, but build it completely: tests, error and 404 states, and docs are part of done. No auth, database, state library, component library, Docker, or generic "framework" code. Ideas go in the README under "With more time", not in code.
- Keep files small and named by what they do. Prefer one clear function over a class hierarchy.
- No new dependencies without asking. Allowed: `next@15`, `react`, `tailwindcss`, `server-only`, `vitest` and `@playwright/test` (dev); `openpyxl`, `pytest`, `ruff` (dev).
- Pin Next.js to 15.x. Never run `npm audit fix --force` (it upgrades to 16).
- When something in the brief is ambiguous, pick the simplest reading and add it to that part's README "Assumptions" list.
- The developer must be able to explain every line in a live call. Prefer plain, readable code over clever code.

## Commands

Run from the repo root:

- `scripts/check.sh` runs every check for both parts and stops on the first failure.

Next.js (`cd nextjs-app`): `npm run dev`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run test:e2e`.

Python (`cd python-po-parser`): `python po_extract.py`, `python po_extract.py --json` (writes the TX9K2QP seed for the Next.js app), `ruff check .`, `python -m pytest -q`.

CI: `.github/workflows/check.yml` runs `scripts/check.sh` on every push.

## Definition of done (per change)

1. `scripts/check.sh` passes.
2. The README of the part you touched is still accurate.
3. One small commit with a message saying what changed and why.
