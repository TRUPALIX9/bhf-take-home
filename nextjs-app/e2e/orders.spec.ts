import { expect, test, type Page } from "@playwright/test";

/** The "Approved" number in the list page's stat row. */
async function approvedCount(page: Page): Promise<number> {
  await page.goto("/");
  return Number(await page.getByTestId("approved-count").innerText());
}

test("list is rendered on the server", async ({ request }) => {
  // The raw HTML, before any JavaScript runs, already contains the data.
  const html = await (await request.get("/")).text();
  expect(html).toContain("TX9K2QP");
  expect(html).toContain("HARBOR POINT TRADING LTD");
});

test("open a PO from the list and see its line items", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "TX9K2QP" }).filter({ visible: true }).first().click();

  await expect(page).toHaveURL(/\/orders\/TX9K2QP$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("TX9K2QP");
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await expect(page.getByTestId("lines-total")).toHaveText("$447,455.12");
});

test.describe("review status", () => {
  const po = "/orders/TX9K4MB";

  // The server keeps status in memory, so always leave this PO pending,
  // even if a test fails half way.
  const resetToPending = async ({ page }: { page: Page }) => {
    await page.goto(po);
    const moveBack = page.getByRole("button", { name: "Move back to review" });
    if (await moveBack.isVisible()) {
      await moveBack.click();
      await expect(page.getByTestId("status")).toHaveText("Pending review");
    }
  };
  test.beforeEach(resetToPending);
  test.afterEach(resetToPending);

  test("approve a PO, then move it back to review", async ({ page }) => {
    const before = await approvedCount(page);

    await page.goto(po);
    const status = page.getByTestId("status");
    await expect(status).toHaveText("Pending review");

    await page.getByRole("button", { name: "Approve" }).click();
    await expect(status).toHaveText("Approved");

    // Stored on the server: survives a reload and shows on the list.
    await page.reload();
    await expect(status).toHaveText("Approved");
    expect(await approvedCount(page)).toBe(before + 1);

    await page.goto(po);
    await page.getByRole("button", { name: "Move back to review" }).click();
    await expect(status).toHaveText("Pending review");
  });
});

test("unknown PO shows the not-found page", async ({ page }) => {
  const response = await page.goto("/orders/NOPE");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "PO not found" })).toBeVisible();
});

test("page never scrolls sideways", async ({ page }) => {
  await page.goto("/orders/TX9K2QP");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

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
