/**
 * Vitest setup for the unit tests in lib/.
 * Run: npm test. The e2e folder is left out; Playwright runs those.
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Same "@/..." import alias as tsconfig.json, pointing at the app root.
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { include: ["lib/**/*.test.ts"] },
});
