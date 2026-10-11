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

  // The server keeps status in memory, so always leave this PO pending,
  // even if a test fails half way.
  const resetToPending = async ({ page }: { page: Page }) => {
    await page.goto(po);
    const moveBack = page.getByRole("button", { name: "Move back to review" });
    if (await moveBack.isVisible()) {
      await moveBack.click();
      // The badge changes at once (optimistic); the button label changes when the save is done.
      await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    }
  };
  test.beforeEach(resetToPending);
  test.afterEach(resetToPending);

  // Proves the change is saved on the server, not just shown in the browser.
  test("approve a PO, then move it back to review", async ({ page }) => {
    const before = await approvedCount(page);

    await page.goto(po);
    const status = page.getByTestId("status");
    await expect(status).toHaveText("Pending review");

    await page.getByRole("button", { name: "Approve" }).click();
    await expect(status).toHaveText("Approved");
    await expect(page.getByRole("button", { name: "Move back to review" })).toBeVisible(); // saved

    // Stored on the server: survives a reload and shows on the list.
    await page.reload();
    await expect(status).toHaveText("Approved");
    expect(await approvedCount(page)).toBe(before + 1);

    await page.goto(po);
    await page.getByRole("button", { name: "Move back to review" }).click();
    await expect(status).toHaveText("Pending review");
  });

  // The "Review" step stops being current once the PO is approved.
  // Two tabs on the same PO. Approving in a stale tab must keep it approved, not flip it back.
  test("a click from an out-of-date tab can't undo an approval", async ({ page, context }) => {
    const stale = await context.newPage();
    await stale.goto(po); // still shows "Pending review" and an Approve button

    await page.goto(po);
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByRole("button", { name: "Move back to review" })).toBeVisible(); // saved

    await stale.getByRole("button", { name: "Approve" }).click();
    await expect(stale.getByRole("button", { name: "Move back to review" })).toBeVisible();
    await stale.reload();
    await expect(stale.getByTestId("status")).toHaveText("Approved");
    await stale.close();
  });

  test("approving updates the step tracker", async ({ page }) => {
    await page.goto("/orders/TX9K4MB");
    const review = page.getByRole("listitem").filter({ hasText: "Review" }).first();
    await expect(review).toHaveAttribute("aria-current", "step");

    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Can be sent on")).toBeVisible();
    await expect(page.getByRole("button", { name: "Move back to review" })).toBeVisible(); // saved
    await expect(review).not.toHaveAttribute("aria-current", "step");

    await page.getByRole("button", { name: "Move back to review" }).click();
    await expect(page.getByText("Waiting for approval")).toBeVisible();
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
test("page never scrolls sideways", async ({ page }) => {
  await page.goto("/orders/TX9K2QP");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

// The filter is in the URL, so it works on first load and can be shared.
// TX9K3RA is the only PO approved in the seed.
test("status tabs filter the list", async ({ page }) => {
  await page.goto("/?status=approved");
  const rows = page.locator("table tbody tr, ul li").filter({ visible: true });
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
  const firstPo = page.locator("tbody tr").first().locator("td").first();

  await page.getByRole("link", { name: /Total cost/ }).click();
  await expect(page).toHaveURL(/sort=total&dir=desc/);
  await expect(firstPo).toHaveText("TX9K2QP"); // the largest PO

  await page.getByRole("link", { name: /Total cost/ }).click();
  await expect(page).toHaveURL(/sort=total&dir=asc/);
  await expect(firstPo).toHaveText("TX9K3RA"); // the smallest PO
});

test("Filters: pick several values, apply, and remove one chip", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Filters/ }).click();
  const panel = page.getByRole("dialog", { name: "Filter purchase orders" });
  await panel.getByLabel(/^China/).check();
  await panel.getByLabel(/^Indus Home Mills/).check();
  await panel.getByRole("button", { name: /^Apply/ }).click();

  // China AND that vendor: no PO is both (Indus ships from Pakistan), so the empty state shows.
  await expect(page).toHaveURL(/country=CHN&vendor=50417/);
  await expect(page.getByText(/No POs from China/)).toBeVisible();

  // Removing the vendor chip leaves the China filter: three POs.
  await page.getByRole("button", { name: "Remove filter Indus Home Mills Pvt Ltd" }).click();
  await expect(page).toHaveURL(/country=CHN$/);
  await expect(page.getByRole("link", { name: /^All/ })).toContainText("3");
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
  await page.getByRole("link", { name: /TX9H1LM/ }).click();
  await expect(page).toHaveURL(/master=TX9H1LM/);
  await expect(page.getByRole("button", { name: "Remove filter Master PO TX9H1LM" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^All/ })).toContainText("2"); // TX9K2QP and TX9K3RA
});
