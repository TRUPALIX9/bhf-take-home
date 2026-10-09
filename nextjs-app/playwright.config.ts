import { defineConfig, devices } from "@playwright/test";

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
    command: `npm run build && npm run start -- --port ${port}`,
    url: `http://localhost:${port}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
