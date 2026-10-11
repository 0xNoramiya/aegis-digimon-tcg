import { gzipSync } from "node:zlib";
import { test, expect } from "@playwright/test";
import { replayFixture } from "../test/replays/fixture";

test("shows both recorded hands on mobile with controls clear of the player's cards", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const replay = replayFixture();
  replay.visibleHandSeats = [0, 1];
  for (const frame of replay.frames) {
    frame.state.players[1]!.hand = frame.state.players[0]!.hand.map((card) => ({
      ...card,
      cardId: "BT1-029",
      ownerSeat: 1,
      instanceId: `opponent-${card.instanceId}`,
    })) as never;
    frame.state.players[1]!.handCount = frame.state.players[1]!.hand.length;
  }
  await page.route("**/auth/me", (route) => route.fulfill({ contentType: "application/json", body: "null" }));
  await page.goto("/profile");
  await page.getByLabel("Open replay file").setInputFiles({
    name: "both-hands.aegis-replay",
    mimeType: "application/gzip",
    buffer: gzipSync(JSON.stringify(replay)),
  });
  const opponent = page.getByTestId("opponent-hand").getByRole("button").first();
  await expect(opponent).toBeVisible();
  await opponent.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const hand = await page.getByTestId("hand").boundingBox();
  const controls = await page.locator(".replay-controls").boundingBox();
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(hand!.y);
  await page.getByTestId("hand").getByRole("button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
