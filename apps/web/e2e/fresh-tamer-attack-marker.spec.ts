import fixture from "../../api/src/engine/scenarios/fresh-tamer-attack-marker.fixture";
import { test, expect } from "./scenario-page";

for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`marks only the newly played Tamer at ${width}px in ${dark ? "dark" : "light"} mode`, async ({
      scenario,
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.addInitScript((enabled) => localStorage.setItem("aegis:darkMode", String(enabled)), dark);
      const refs = await scenario.openFixture(fixture);
      await scenario.play("Takuya Kanbara", "Tamer");
      await scenario.resolveUntil(
        (state) =>
          !state.pendingDecision &&
          state.players[0]!.battleArea.some(
            (permanent) => permanent.topCard.instanceId === refs.instanceId("freshTamer"),
          ),
      );
      const state = await scenario.snapshot();
      const fresh = state.players[0]!.battleArea.find(
        (permanent) => permanent.topCard.instanceId === refs.instanceId("freshTamer"),
      )!;
      const freshCard = page.locator(`[data-id="${fresh.permanentId}"][role="button"]`);
      const establishedCard = page.locator(`[data-id="${refs.permanentId("establishedTamer")}"][role="button"]`);
      expect(fresh.summoningSick).toBe(true);
      await expect(freshCard).toHaveAccessibleName(/Takuya Kanbara.*Can't attack yet/i);
      await expect(freshCard.locator(".game-summoning-ring")).toBeVisible();
      await expect(establishedCard).not.toHaveAccessibleName(/Can't attack yet/i);
      await expect(establishedCard.locator(".game-summoning-ring")).toHaveCount(0);
      await scenario.healthy();
      await testInfo.attach(`tamer-marker-${width}-${dark ? "dark" : "light"}`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    });
  }
}
