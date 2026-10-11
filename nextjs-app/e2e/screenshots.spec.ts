/**
 * Captures the README images from the running app; it is not a test of behaviour.
 * Run: npm run screenshots (desktop project only). Output: ../docs/screenshots.
 */
import { expect, test } from "@playwright/test";

// Not part of the normal test run. `npm run screenshots` sets SCREENSHOTS=1 and
// saves the README images to ../docs/screenshots.
test.skip(!process.env.SCREENSHOTS, "only runs with npm run screenshots");

const dir = "../docs/screenshots";

// Each shot waits for a known element first, so the page is fully drawn.
test("README screenshots", async ({ page }) => {
  // Still images: skip fade-ins so nothing is captured half-drawn.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/");
  await expect(page.locator("tbody tr, ul li").filter({ visible: true }).first()).toBeVisible();
  await page.screenshot({ path: `${dir}/list.png` });

  // The Filters panel open, with one origin ticked.
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByRole("dialog").getByLabel(/^Larkshore/).check();
  await page.getByRole("dialog").getByLabel(/^Westlake/).check();
  await page.screenshot({ path: `${dir}/filters.png`, clip: { x: 0, y: 0, width: 1280, height: 560 } });
  await page.keyboard.press("Escape");

  await page.goto("/orders/TX9K2QP");
  await expect(page.getByTestId("lines-total")).toBeVisible();
  await page.screenshot({ path: `${dir}/detail.png`, fullPage: true });

  // The "how this PO was checked" panel.
  await page.getByLabel("How this PO was checked").click();
  await page.screenshot({ path: `${dir}/checks-info.png`, clip: { x: 0, y: 60, width: 1280, height: 440 } });
  await page.getByLabel("How this PO was checked").click();

  // The confirmation dialog, then the approved state, then put it back.
  await page.getByRole("button", { name: "Approve" }).click();
  await page.screenshot({ path: `${dir}/confirm.png`, clip: { x: 240, y: 200, width: 800, height: 400 } });
  await page.getByRole("dialog").getByRole("button", { name: "Approve PO" }).click();
  await expect(page.getByRole("button", { name: "Undo approval" })).toBeVisible();
  await page.screenshot({ path: `${dir}/detail-approved.png`, clip: { x: 0, y: 0, width: 1280, height: 260 } });
  await page.getByRole("button", { name: "Undo approval" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Undo approval" }).click();
  await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();

  await page.goto("/orders/TX9K5DC"); // fails on purpose (FAIL_PO in playwright.config.ts)
  await expect(page.getByText("Error PO-500")).toBeVisible();
  await page.screenshot({ path: `${dir}/error.png`, clip: { x: 0, y: 0, width: 1280, height: 360 } });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator("tbody tr, ul li").filter({ visible: true }).first()).toBeVisible();
  await page.screenshot({ path: `${dir}/mobile.png` });
});

test("palette", async ({ page }) => {
  // Read the real color tokens from the app's CSS, so the image can't drift from the code.
  await page.goto("/");
  const tokens = await page.evaluate(() => {
    const names = [
      "surface", "subtle", "line", "line-strong", "muted", "ink", "inverse",
      "accent", "accent-dark", "accent-soft", "pending", "pending-bg", "approved", "approved-bg", "danger",
    ];
    const css = getComputedStyle(document.documentElement);
    return names.map((n) => [n, css.getPropertyValue(`--color-${n}`).trim()]);
  });

  // Draw the swatches on a blank page, then screenshot just the grid.
  const swatches = tokens
    .map(
      ([name, value]) => `<div class="s"><div class="c" style="background:${value}"></div>
        <b>${name}</b><code>${value}</code></div>`,
    )
    .join("");
  await page.setContent(`<style>
      body{font:13px -apple-system,Helvetica,Arial,sans-serif;margin:24px;color:#1b2330;background:#fff}
      .g{display:grid;grid-template-columns:repeat(8,120px);gap:16px}
      .s{display:flex;flex-direction:column;gap:4px}
      .c{height:56px;border-radius:8px;border:1px solid #e4e9ef}
      code{color:#5d6c7b}
    </style><div class="g" id="g">${swatches}</div>`);
  await page.locator("#g").screenshot({ path: `${dir}/palette.png` });
});
