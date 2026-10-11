/**
 * Next.js config. The only setting: tests and scripts/check.sh build into
 * .next-test (NEXT_DIST_DIR), so they never overwrite the .next folder a running
 * dev server is using. Without this, running the checks while `npm run dev` is open
 * breaks the dev server until it is restarted.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
