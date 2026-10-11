# Design notes

How the two parts fit together, how data and requests move through each one, and why it is built this way. Diagrams are Mermaid, so GitHub renders them.

## 1. System overview

Two independent programs. The only link is data: the parser's JSON output for the sample PO was copied once into the app's seed file.

```mermaid
flowchart LR
  subgraph B["Part B: python-po-parser"]
    TXT["input/purchase_order_sample.txt"] --> PY["po_extract.py"]
    TPL["input/output_template_blank.xlsx"] --> PY
    PY --> XLSX["output/purchase_order_sample.xlsx"]
    PY -- "--json" --> JSON["output/TX9K2QP.json"]
  end

  subgraph A["Part A: nextjs-app"]
    SEED["data/orders.json"] --> LIB["lib/orders.ts"]
    LIB --> PAGES["List and detail pages"]
    PAGES --> USER(("Reviewer in a browser"))
    USER -- "Approve / Move back" --> ACTION["Server action"]
    ACTION --> LIB
  end

  JSON -. "copied once by hand" .-> SEED
```

## 2. Purchase order lifecycle

Where a PO is in the business flow. The step tracker on the detail page (`components/ProcessSteps.tsx`) shows exactly these states.

```mermaid
stateDiagram-v2
  [*] --> Received: vendor PO arrives as text
  Received --> Parsed: po_extract.py reads header, items, UPCs
  Parsed --> Flagged: EXT QTY / EXT COST / TOTALS mismatch
  Parsed --> PendingReview: all checks pass
  Flagged --> PendingReview: fixed and re-run
  PendingReview --> Approved: reviewer clicks Approve
  Approved --> PendingReview: reviewer clicks Move back to review
  Approved --> ReadyForDownstream
  ReadyForDownstream --> [*]
```

In the app, only `PendingReview ⇄ Approved` is stored (`ReviewStatus` in `lib/types.ts`). "Received" and "Parsed" are always done for seed data; "Parsed and checked" turns red if the lines don't add up to the PO total.

## 3. Part A: nextjs-app

### Module graph

Arrows point from a module to what it uses. Only `lib/orders.ts` touches data.

```mermaid
flowchart TD
  List["app/page.tsx<br/>heading + 2 Suspense parts"] --> Summary["OrdersSummary (server)<br/>stats + tab counts"]
  List --> Table["OrdersTable (server)<br/>rows for the filter"]
  Summary --> Tabs["StatusTabs (client)<br/>instant highlight"]
  Detail["orders/[poNumber]/page.tsx<br/>404 check + Suspense"] --> OD["OrderDetail (server)"]
  Steps["ProcessSteps"]
  OD --> Review["ReviewPanel (client)<br/>useOptimistic + useActionState"]
  Review --> Steps
  Review --> Action["app/actions.ts<br/>setReviewStatus"]
  OD --> UI["components/ui<br/>Button, Badge, Card, Th/Td, Spinner"]
  Review --> UI
  Action --> Orders["lib/orders.ts<br/>server-only, cache()"]
  Summary --> Orders
  Table --> Orders
  OD --> Orders
  Detail --> Orders
  Action --> Errors["lib/errors.ts"]
  Boundaries["error.tsx, global-error.tsx,<br/>orders/[poNumber]/error.tsx"] --> Errors
  Orders --> Seed[("data/orders.json")]
```

### Page request lifecycle (first load)

The shell is sent at once; data parts stream in behind skeletons. The 404 check happens before anything is sent, so the status code is real.

```mermaid
sequenceDiagram
  participant B as Browser
  participant P as orders/[poNumber]/page.tsx
  participant O as lib/orders.ts
  participant D as OrderDetail
  B->>P: GET /orders/TX9K2QP
  P->>O: orderExists("TX9K2QP")
  alt unknown PO
    P-->>B: 404 + not-found.tsx (PO-404)
  else known PO
    P-->>B: 200, header + breadcrumb + skeleton (streamed)
    P->>D: render inside Suspense
    D->>O: await getOrder()
    O-->>D: order with live status
    D-->>B: real content replaces the skeleton
  end
```

### Server action lifecycle (Approve)

```mermaid
sequenceDiagram
  participant U as Reviewer
  participant BTN as ReviewPanel
  participant A as actions.ts
  participant O as lib/orders.ts
  U->>BTN: click Approve
  BTN->>BTN: optimistic: badge + step tracker flip, connector fills, spinner on button
  BTN->>A: POST form data (poNumber)
  A->>O: orderExists(poNumber)
  alt unknown PO
    A-->>BTN: { error: PO-404 }
    BTN-->>U: React rolls the optimistic status back, error under the button
  else
    A->>O: setStatus(poNumber, target)
    alt save fails
      A-->>BTN: { error: PO-501 } (logged on server)
      BTN-->>U: React rolls the optimistic status back, error under the button
    else saved
      A->>A: revalidatePath("/") and ("/orders/po")
      A-->>BTN: {} + fresh page data in the same response
      BTN-->>U: server status now matches what is already on screen
    end
  end
```

### Tab switch lifecycle (only the table reloads)

```mermaid
sequenceDiagram
  participant U as Reviewer
  participant T as StatusTabs (client)
  participant S as Next.js server
  U->>T: click "Approved"
  T->>T: useOptimistic: tab highlighted + spinner at once
  T->>S: router.push("/?status=approved") in a transition
  Note over T,S: Summary boundary has no key: stays on screen.<br/>Table boundary is keyed by filter: only it reloads.
  S-->>T: new table rows (getOrders read once via cache())
  T-->>U: rows swap, spinner stops
```

### Error handling flow

```mermaid
flowchart TD
  E{"Where did it fail?"}
  E -- "unknown PO in URL" --> NF["not-found.tsx<br/>PO-404, real 404 status"]
  E -- "server action" --> AE["action returns { error }<br/>PO-404, PO-400 or PO-501 under the button"]
  E -- "rendering one PO" --> PE["orders/[poNumber]/error.tsx<br/>PO-500, list still works"]
  E -- "any other page" --> GE["app/error.tsx<br/>APP-500, header stays"]
  E -- "root layout" --> RE["global-error.tsx<br/>APP-503, own html/body"]
  PE --> R["ErrorState: message, code,<br/>Next digest, Try again, Back"]
  GE --> R
  RE --> R
```

### Decisions

| Decision | Choice | Why |
|---|---|---|
| Data | `data/orders.json`, 4 POs. TX9K2QP comes from the Python parser; the others are made-up sample data. | Realistic for BHF; no external API to fail. |
| Where status lives | In-memory `Map` on `globalThis`, seeded from JSON | No dependencies, works on Vercel's read-only filesystem. Resets on restart (stated in README). |
| Rendering | `dynamic = "force-dynamic"` on both pages | Status changes at runtime; a prerendered page would show stale status. |
| Data access | Only `lib/orders.ts` touches data, all async | Swapping in a database later is a one-file change. |
| Client code | Review panel, status tabs, error state | Everything else stays on the server. |
| Set, not toggle | The button sends the status it wants; the server sets exactly that | Idempotent: a repeated click, a stale tab or two reviewers at once can't flip an approval back. |
| Partial reloads | Summary and table are separate `<Suspense>` parts; only the table is keyed by filter | Switching tabs reloads only the rows. `cache()` makes both parts share one data read. |
| Errors | Codes and messages in `lib/errors.ts`; three error boundaries | A person sees a plain message and a code to quote; the action returns errors instead of throwing. |
| No `loading.tsx` | Skeletons come from `<Suspense>` inside the page | `loading.tsx` streamed a 200 before `notFound()` ran, so unknown POs lost their 404. |

## 4. Part B: python-po-parser

### Processing pipeline

```mermaid
flowchart TD
  IN["purchase_order_sample.txt"] --> H["parse_header<br/>BUYER, SHIP TERMS, PO#, REF, dates"]
  IN --> AD["read_block / read_side_by_side_blocks<br/>VENDOR, SHIP TO, BILL TO"]
  IN --> IT["parse_items"]
  IT --> ROW{"item row regex matches?"}
  ROW -- no --> ERR1["ValueError: line N is not an item row"]
  ROW -- yes --> UPC{"UPC on the next line?"}
  UPC -- no --> ERR2["ValueError: SKU has no UPC"]
  UPC -- yes --> LI["LineItem"]
  IN --> TOT["parse_totals"]
  H --> PO["PurchaseOrder"]
  AD --> PO
  LI --> PO
  TOT --> PO
  PO --> V["check_item: CTNS x CSPK, COST x QTY<br/>check_totals: TOTALS vs sum"]
  V --> W["write_xlsx from template<br/>red fill + comment on failing cells"]
  PO -- "--json" --> J["TX9K2QP.json"]
  W --> OUT["output/purchase_order_sample.xlsx"]
  V --> EXIT{"any flags?"}
  EXIT -- yes --> X1["exit code 1"]
  EXIT -- no --> X0["exit code 0"]
```

### Call graph

```mermaid
flowchart LR
  main --> parse
  main --> all_flags
  main --> write_xlsx
  main -. "--json" .-> write_json
  parse --> parse_header
  parse --> parse_items
  parse --> parse_totals
  all_flags --> check_item
  all_flags --> check_totals
  write_xlsx --> row_values
  write_xlsx --> check_item
  write_json --> order_json
```

### Decisions

| Decision | Choice | Why |
|---|---|---|
| Item rows | One anchored regex with named groups | Descriptions contain spaces and numbers are right-aligned; slicing by column is more fragile. |
| Unreadable rows | Any non-blank line in the table that is not an item raises with its line number | A row the regex can't read is never dropped silently. |
| UPC | Must be the next line (`^ {4}\d{12,14}$`), else raise | The UPC belongs to the row above; a missing one is an error, not a skip. |
| SHIP TO / BILL TO | Split each line at the column where "BILL TO" starts | The two blocks sit side by side. |
| IDs | Strings with Excel `@` format | Keeps leading zeros in UPC and Vendor Part #. |
| Money | `Decimal` for parsing and checks | Exact comparison, no float noise. |
| Total Cost | PO grand total (447,455.12) on every row | Header values repeat on every row; per-row cost is already EXT Cost. |
| Flags | Red fill and a comment on the failing cell, plus stdout and exit code 1 | The schema must match the template, so no extra columns. |

## 5. Checks and delivery

```mermaid
flowchart LR
  DEV["Edit code"] --> CHK["scripts/check.sh"]
  CHK --> N1["next: lint"] --> N2["typecheck"] --> N3["Vitest"] --> N4["build"] --> N5["Playwright<br/>desktop + 375px"]
  CHK --> P1["python: ruff"] --> P2["pytest"] --> P3["run on sample"]
  N5 --> OK{"all pass?"}
  P3 --> OK
  OK -- yes --> C["small commit"] --> GH["push"] --> CI["GitHub Actions runs check.sh"]
  OK -- no --> DEV
```
