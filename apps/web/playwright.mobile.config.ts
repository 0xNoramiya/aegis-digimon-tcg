import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

const braveExecutable = process.env.AEGIS_BRAVE_PATH ?? "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const pixel = devices["Pixel 7"];
const firefoxAndroidAgent = "Mozilla/5.0 (Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0";

// Run one project per invocation (`--project mobile-safari`) to keep a single
// browser engine in memory at a time.
export default defineConfig({
  ...baseConfig,
  testMatch: "**/mobile-*.spec.ts",
  timeout: 120_000,
  projects: [
    { name: "mobile-chrome", use: { ...pixel, browserName: "chromium" } },
    {
      name: "mobile-brave",
      use: { ...pixel, browserName: "chromium", launchOptions: { executablePath: braveExecutable } },
    },
    {
      // Gecko has no isMobile emulation; viewport, touch, and user agent cover what the client reads.
      name: "mobile-firefox",
      use: {
        browserName: "firefox",
        viewport: pixel.viewport,
        deviceScaleFactor: pixel.deviceScaleFactor,
        hasTouch: true,
        userAgent: firefoxAndroidAgent,
      },
    },
    { name: "mobile-safari", use: { ...devices["iPhone 15"], browserName: "webkit" } },
  ],
});
