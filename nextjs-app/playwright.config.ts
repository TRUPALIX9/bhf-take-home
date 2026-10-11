/**
 * Playwright setup for the e2e tests in ./e2e.
 * Run: npm run test:e2e. It builds the app, starts it on port 3100 and runs
 * every test twice: desktop Chrome and a 375px phone.
 */
import { defineConfig, devices } from "@playwright/test";

// Not 3000, so a dev server left running does not get tested by mistake.
const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  // Tests share one server and its in-memory status, so run them in order.
  workers: 1,
  fullyParallel: false,
  // PW_CHANNEL=chrome uses the installed Google Chrome instead of the downloaded Chromium.
  use: { baseURL: `http://localhost:${port}`, channel: process.env.PW_CHANNEL },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Phone width from the UI spec: 375px.
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    // Test the production build, which is what would ship, not the dev server.
    command: `npm run build && npm run start -- --port ${port}`,
    url: `http://localhost:${port}`,
    timeout: 180_000,
    // Locally, reuse a server already on the port; in CI always start fresh.
    reuseExistingServer: !process.env.CI,
    // Makes one PO fail to load, so the error boundary can be tested.
    env: { FAIL_PO: "TX9K5DC", NEXT_DIST_DIR: ".next-test" },
  },
});
