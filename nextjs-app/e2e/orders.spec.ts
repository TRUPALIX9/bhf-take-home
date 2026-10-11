/**
 * End-to-end tests: a real production build in a browser, desktop and phone width.
 * Run: npm run test:e2e (playwright.config.ts builds and starts the server).
 * They cover the brief's flows: list, open a PO, approve, errors, mobile layout.
 */
import { expect, test, type Page } from "@playwright/test";

/** The number on the "Approved" tab. */
async function approvedCount(page: Page): Promise<number> {
  await page.goto("/");
  // The "Approved" tab shows its count, e.g. "Approved 1".
  const text = await page.getByRole("link", { name: /^Approved/ }).innerText();
  return Number(text.replace(/\D/g, ""));
}

// --- list and detail ---

test("list is rendered on the server", async ({ request }) => {
  // The raw HTML, before any JavaScript runs, already contains the data.
  const html = await (await request.get("/")).text();
  expect(html).toContain("TX9K2QP");
  expect(html).toContain("Harbor Point Trading Ltd"); // vendor names are title-cased in the list
});

test("open a PO from the list and see its line items", async ({ page }) => {
  await page.goto("/");
  // The list renders as a table on desktop and as cards on mobile; click whichever is shown.
  await page.getByRole("link", { name: "TX9K2QP" }).filter({ visible: true }).first().click();

  await expect(page).toHaveURL(/\/orders\/TX9K2QP$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("TX9K2QP");
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await expect(page.getByTestId("lines-total")).toHaveText("$447,455.12");
});

// --- review status ---

test.describe("review status", () => {
  const po = "/orders/TX9K4MB";

  /** Opens a decision's dialog, optionally types a reason, and confirms it. */
  async function decide(page: Page, button: string, confirm: string, reason?: string) {
    await page.getByRole("button", { name: button }).click();
    const dialog = page.getByRole("dialog");
    if (reason !== undefined) await dialog.getByLabel("Reason (required)").fill(reason);
    await dialog.getByRole("button", { name: confirm }).click();
  }

  // The server keeps status in memory, so always leave this PO pending,
  // even if a test fails half way.
  const resetToPending = async ({ page }: { page: Page }) => {
    await page.goto(po);
    if (await page.getByRole("button", { name: "Undo approval" }).isVisible()) {
      await decide(page, "Undo approval", "Undo approval");
      // The badge changes at once (optimistic); the buttons change when the save is done.
      await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    }
    if (await page.getByRole("button", { name: "Corrected PO received" }).isVisible()) {
      await decide(page, "Corrected PO received", "Review again");
      // The badge changes at once (optimistic); the buttons change when the save is done.
      await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    }
  };
  test.beforeEach(resetToPending);
  test.afterEach(resetToPending);

  test("approving asks for confirmation, then saves", async ({ page }) => {
    const before = await approvedCount(page);
    await page.goto(po);
    const status = page.getByTestId("status");

    // Cancel changes nothing.
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByRole("dialog")).toContainText("Approve this PO?");
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await expect(status).toHaveText("Pending review");

    // Confirm approves it, and it is stored on the server: survives a reload, counted on the list.
    await decide(page, "Approve", "Approve PO");
    await expect(page.getByRole("button", { name: "Undo approval" })).toBeVisible(); // saved
    await page.reload();
    await expect(status).toHaveText("Approved");
    expect(await approvedCount(page)).toBe(before + 1);
  });

  test("sending back for correction needs a note, then the corrected PO goes back to review", async ({ page }) => {
    await page.goto(po);
    await page.getByRole("button", { name: "Send back for correction" }).click();
    const dialog = page.getByRole("dialog");
    // An empty note is refused by the form, so the dialog stays open.
    await dialog.getByRole("button", { name: "Send back" }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("What needs fixing (required)").fill("Ship date doesn't match the schedule");
    await dialog.getByRole("button", { name: "Send back" }).click();

    await expect(page.getByTestId("status")).toHaveText("Needs correction");
    await expect(page.getByText("Ship date doesn't match the schedule")).toBeVisible();

    // When the fix arrives, it goes back to review (with confirmation).
    await decide(page, "Corrected PO received", "Review again");
    await expect(page.getByTestId("status")).toHaveText("Pending review");
  });

  test("undoing an approval asks for confirmation", async ({ page }) => {
    await page.goto(po);
    await decide(page, "Approve", "Approve PO");
    await page.getByRole("button", { name: "Undo approval" }).click();
    await expect(page.getByRole("dialog")).toContainText("no longer released downstream");
    await page.getByRole("dialog").getByRole("button", { name: "Undo approval" }).click();
    await expect(page.getByTestId("status")).toHaveText("Pending review");
  });

  // Two tabs on the same PO. Approving in a stale tab must keep it approved, not flip it back.
  test("a decision from an out-of-date tab can't undo another", async ({ page, context }) => {
    const stale = await context.newPage();
    await stale.goto(po); // still shows "Pending review" and an Approve button

    await page.goto(po);
    await decide(page, "Approve", "Approve PO");
    await expect(page.getByRole("button", { name: "Undo approval" })).toBeVisible(); // saved

    await decide(stale, "Approve", "Approve PO");
    await expect(stale.getByRole("button", { name: "Undo approval" })).toBeVisible();
    await stale.reload();
    await expect(stale.getByTestId("status")).toHaveText("Approved");
    await stale.close();
  });
});


// --- errors and layout ---

// A real 404 status, not a 200 page that only says "not found".
test("unknown PO shows the not-found page", async ({ page }) => {
  const response = await page.goto("/orders/NOPE");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "PO not found" })).toBeVisible();
});

// The wide line-item table must scroll inside its own box, most of all at 375px.
test("pages never scroll sideways, at phone, tablet and desktop widths", async ({ page }) => {
  for (const width of [375, 800, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/orders/TX9K2QP"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});

// The filter is in the URL, so it works on first load and can be shared.
// TX9K3RA is the only PO approved in the seed.
test("status tabs filter the list", async ({ page }) => {
  await page.goto("/?status=approved");
  const rows = page.locator("table tbody tr:has(td), ul li").filter({ visible: true }); // PO rows, not master-PO headers
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("TX9K3RA");
});

test("unknown PO page shows its error code", async ({ page }) => {
  await page.goto("/orders/NOPE");
  await expect(page.getByText("Error PO-404")).toBeVisible();
});

test("a PO that fails to load shows the error boundary, not a crash", async ({ page }) => {
  // playwright.config.ts starts the server with FAIL_PO=TX9K5DC.
  await page.goto("/orders/TX9K5DC");
  await expect(page.getByText("Error PO-500")).toBeVisible();
  await expect(page.getByRole("heading", { name: "This purchase order could not load" })).toBeVisible();

  await page.getByRole("link", { name: "Back to purchase orders" }).click();
  await expect(page.getByRole("heading", { name: "Purchase orders" })).toBeVisible();
});

// --- sorting and clickable cards ---

test("clicking a column header sorts the table, and clicking again reverses it", async ({ page, isMobile }) => {
  test.skip(isMobile, "the sortable table is the desktop view; phones get the card list");
  await page.goto("/");
  const firstPo = page.locator("tbody tr:has(td)").first().getByRole("link");

  await page.getByRole("link", { name: /Total cost/ }).click();
  await expect(page).toHaveURL(/sort=total&dir=desc/);
  await expect(firstPo).toHaveText("TX9K2QP"); // the largest PO

  await page.getByRole("link", { name: /Total cost/ }).click();
  await expect(page).toHaveURL(/sort=total&dir=asc/);
  await expect(firstPo).toHaveText("TX9K3RA"); // the smallest PO
});

test("Filters: origin and vendor as a tree, grouped chips, Clear all", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Filters/ }).click();
  const panel = page.getByRole("dialog", { name: "Filter purchase orders" });
  const allTab = page.getByRole("link", { name: /^All/ });

  // Ticking a country ticks every vendor under it, and filters at once.
  await panel.getByLabel(/^China/).check();
  await expect(page).toHaveURL(/country=CHN/);
  await expect(panel.getByLabel(/^Harbor Point/)).toBeChecked();
  await expect(allTab).toContainText("3");

  // A vendor from another country adds to it (country OR vendor): all four POs.
  await panel.getByLabel(/^Indus Home Mills/).check();
  await expect(allTab).toContainText("4");

  // Unticking one vendor of a fully ticked country keeps the others: 3 POs, China partly ticked.
  await panel.getByLabel(/^Harbor Point/).uncheck();
  await expect(allTab).toContainText("3");
  await expect(panel.getByLabel(/^China/)).not.toBeChecked();
  await page.getByRole("button", { name: "Done" }).click();

  // Several picks show as one chip per group; it opens a list to remove from.
  // Indus is Pakistan's only vendor, so ticking it counts as all of Pakistan.
  await page.getByRole("button", { name: "Origin & vendor (3)" }).click();
  await page.getByRole("button", { name: "Remove filter Pakistan" }).click();
  await expect(allTab).toContainText("2");

  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(allTab).toContainText("4");
});

test("clicking anywhere on a row opens the PO", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones get the card list, where the whole card is already a link");
  await page.goto("/");
  // The PO link is stretched over the row, so click at the cell's position like a person would.
  await page.getByRole("cell", { name: "Larkshore Textile Co Ltd" }).click({ force: true });
  await expect(page).toHaveURL(/\/orders\/TX9K3RA$/);
});

test("an empty tab shows a friendly message", async ({ page }) => {
  // Pakistan has one PO and it is pending, so "Approved" for Pakistan is empty.
  await page.goto("/?status=approved&country=PAK");
  await expect(page.getByText("No approved POs from Pakistan yet")).toBeVisible();
  await page.getByRole("link", { name: "Show all purchase orders" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("Ref master PO opens the list of POs that share it", async ({ page }) => {
  await page.goto("/orders/TX9K2QP");
  // The link on the PO document (the breadcrumb has one too).
  await page.getByRole("article").getByRole("link", { name: /TX9H1LM/ }).click();
  await expect(page).toHaveURL(/master=TX9H1LM/);
  await expect(page.getByRole("button", { name: "Remove filter Master PO TX9H1LM" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^All/ })).toContainText("2"); // TX9K2QP and TX9K3RA
});

test("the PO page breadcrumb shows its master PO", async ({ page }) => {
  await page.goto("/orders/TX9K3RA");
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs).toContainText("Purchase orders / Master PO TX9H1LM / TX9K3RA");
});

test("a master PO group collapses and expands", async ({ page, isMobile }) => {
  test.skip(isMobile, "same component on phones; checked once on desktop");
  await page.goto("/");
  const row = page.getByRole("link", { name: "TX9K3RA" });
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: "Collapse master PO TX9H1LM" }).click();
  await expect(row).toBeHidden();
  await page.getByRole("button", { name: "Expand master PO TX9H1LM" }).click();
  await expect(row).toBeVisible();
});

test("line items sort by a column, reverse, then go back to printed order", async ({ page }) => {
  await page.goto("/orders/TX9K2QP");
  const firstSku = page.locator("article tbody tr").first().locator("td").nth(1);
  await expect(firstSku).toContainText("71097188"); // printed order

  await page.getByRole("link", { name: /Line cost/ }).click();
  await expect(page).toHaveURL(/lines=extCost&dir=desc/);
  await expect(firstSku).toContainText("71097225"); // $124,801.60, the largest line

  await page.getByRole("link", { name: /Line cost/ }).click(); // reversed
  await expect(firstSku).toContainText("71293238"); // $444.60, the smallest line
  await page.getByRole("link", { name: /Line cost/ }).click(); // back to printed order
  await expect(page).toHaveURL(/\/orders\/TX9K2QP$/);
  await expect(firstSku).toContainText("71097188");
});

test("the i button explains what was checked", async ({ page }) => {
  await page.goto("/orders/TX9K2QP");
  await page.getByLabel("How this PO was checked").click();
  await expect(page.getByText("All 7 checks passed")).toBeVisible();
  await expect(page.getByText("Each line's units equal its cartons times the number per carton.")).toBeVisible();
});
