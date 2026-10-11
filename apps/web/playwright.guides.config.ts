import { defineConfig } from "@playwright/test";

const baseURL = process.env.AEGIS_GUIDES_BASE_URL;
if (!baseURL) throw new Error("Set AEGIS_GUIDES_BASE_URL to the gateway serving the published web build.");

export default defineConfig({
  testDir: "./e2e",
  tsconfig: "./e2e/tsconfig.json",
  testMatch: "strategy-guides.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    locale: "en-US",
    actionTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
