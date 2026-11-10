import { defineConfig } from "../../apps/web/node_modules/@playwright/test/index.mjs";
import { fileURLToPath } from "node:url";

process.env.NODE_ENV = "test";

const web = fileURLToPath(new URL("../../apps/web/", import.meta.url));
const port = Number(process.env.AEGIS_E2E_WEB_PORT ?? 4175);
const edgePort = Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569);

export default defineConfig({
  build: { external: ["**/apps/api/dist/**", "**/packages/shared/dist/**"] },
  testDir: fileURLToPath(new URL("./", import.meta.url)),
  testMatch: "unpaused-opener.spec.mjs",
  tsconfig: `${web}e2e/tsconfig.json`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: { actionTimeout: 20_000, locale: "en-US", video: "off", trace: "off" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    cwd: web,
    env: { NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=2048` },
    command: `VITE_AEGIS_API_URL=ws://127.0.0.1:${edgePort} VITE_GOOGLE_CLIENT_ID=e2e-client.apps.googleusercontent.com pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/e2e/harness.html`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
