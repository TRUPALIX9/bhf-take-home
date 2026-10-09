import { expect, test } from "@playwright/test";

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

test("approve a PO, then move it back to review", async ({ page }) => {
  await page.goto("/orders/TX9K4MB");
  const status = page.getByTestId("status");
  await expect(status).toHaveText("Pending review");

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(status).toHaveText("Approved");

  // The change is stored on the server, so it survives a reload and shows on the list.
  await page.reload();
  await expect(status).toHaveText("Approved");
  await page.goto("/");
  await expect(page.getByTestId("summary")).toContainText("2 of 4 approved");

  // Put it back so the tests can run again against the same server.
  await page.goto("/orders/TX9K4MB");
  await page.getByRole("button", { name: "Move back to review" }).click();
  await expect(status).toHaveText("Pending review");
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
  expect(overflow).toBe(0);
});
