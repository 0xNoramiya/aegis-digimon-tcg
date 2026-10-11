import { test, expect } from "@playwright/test";
import { startBrowserServer } from "./server";
import { PracticePage } from "./practice-page";

let server: Awaited<ReturnType<typeof startBrowserServer>>;
test.beforeAll(async () => {
  server = await startBrowserServer({ holdBotAllTurns: false });
});
test.afterAll(async () => {
  await server?.close();
});

test("a new strategy-guide visitor starts a real practice match from the product lobby", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/play?utm_source=strategy-guides&utm_content=fundamentals");
  await new PracticePage(page).startMatch();
  expect(errors).toEqual([]);
});
