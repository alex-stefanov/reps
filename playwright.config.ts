import path from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * E2E runs against a real dev server with an isolated PGlite database and a
 * mock GitHub API (so both verification outcomes can be proven). Single
 * worker: the suite walks one user's day in order.
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3100",
    timezoneId: "UTC",
  },
  webServer: [
    {
      command: "npx tsx tests/e2e/mock-github.ts",
      port: 4799,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --port 3100",
      port: 3100,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        PGLITE_DATA_DIR: path.join(process.cwd(), ".pglite-e2e", "data"),
        AUTH_DEV_MODE: "true",
        AUTH_SECRET: "e2e-secret",
        CRON_SECRET: "e2e-cron-secret",
        GITHUB_API_URL: "http://127.0.0.1:4799",
      },
    },
  ],
});
