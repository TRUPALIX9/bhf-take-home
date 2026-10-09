import { expect, test } from "@playwright/test";

// Not part of the normal test run. `npm run screenshots` sets SCREENSHOTS=1 and
// saves the README images to ../docs/screenshots.
test.skip(!process.env.SCREENSHOTS, "only runs with npm run screenshots");

const dir = "../docs/screenshots";

test("README screenshots", async ({ page }) => {
  // Still images: skip fade-ins so nothing is captured half-drawn.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/");
  await expect(page.getByTestId("approved-count")).toBeVisible();
  await page.screenshot({ path: `${dir}/list.png` });

  await page.goto("/orders/TX9K2QP");
  await expect(page.getByTestId("lines-total")).toBeVisible();
  await page.screenshot({ path: `${dir}/detail.png`, fullPage: true });

  // Approved state, then put it back.
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("button", { name: "Move back to review" })).toBeVisible();
  await page.waitForTimeout(700); // let the step animation finish
  await page.screenshot({ path: `${dir}/detail-approved.png`, clip: { x: 0, y: 0, width: 1280, height: 330 } });
  await page.getByRole("button", { name: "Move back to review" }).click();
  await expect(page.getByText("Waiting for approval")).toBeVisible();

  await page.goto("/orders/TX9K5DC"); // fails on purpose (FAIL_PO in playwright.config.ts)
  await expect(page.getByText("Error PO-500")).toBeVisible();
  await page.screenshot({ path: `${dir}/error.png`, clip: { x: 0, y: 0, width: 1280, height: 360 } });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByTestId("approved-count")).toBeVisible();
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
