import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { replayFixture } from "../test/replays/fixture";

for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`#41 sorts distinct trash copies at ${width}px, ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await page.goto("/e2e/replay-harness.html");
      await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
      const replay = replayFixture();
      const template = replay.frames[0]!.state.players[0]!.hand[0]!;
      for (const frame of replay.frames) {
        frame.state.players[0]!.trash = ["ST1-03", "BT1-011", "ST1-03"].map((cardId, index) => ({
          ...structuredClone(template),
          cardId,
          artId: cardId,
          instanceId: `trash-${index}`,
        })) as never;
      }
      await page.getByLabel("Open replay file").setInputFiles({
        name: "trash.aegis-replay",
        mimeType: "application/gzip",
        buffer: gzipSync(JSON.stringify(replay)),
      });
      await page.getByLabel("Hide controls", { exact: true }).click();
      await page.locator(".game-utility-slot--you-trash").click();
      const sort = page.getByRole("combobox", { name: "Sort trash" });
      await expect(sort).toBeVisible();
      const cards = page.locator(".trash-viewer__card, .trash-sheet__row > button");
      await expect(cards).toHaveCount(3);
      await expect(cards.nth(0)).toContainText("copy 2 of 2");
      await expect(cards.nth(2)).toContainText("copy 1 of 2");
      await sort.selectOption("name");
      await expect(cards.nth(0)).toContainText("copy 2 of 2");
      await expect(cards.nth(1)).toContainText("copy 1 of 2");
      const bounds = await sort.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await test.info().attach("sorted trash", { body: await page.screenshot(), contentType: "image/png" });
    });
  }
}
