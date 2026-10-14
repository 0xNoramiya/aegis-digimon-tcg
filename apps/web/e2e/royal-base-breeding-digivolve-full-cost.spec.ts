import fixture from "../../api/src/engine/scenarios/royal-base-breeding-digivolve-full-cost.fixture";
import { test, expect } from "./scenario-page";

test("Royal Base leaves a breeding digivolution at full cost and reduces the battle-area one", async ({
  scenario,
  page,
}) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  const memoryBefore = (await scenario.snapshot()).memory;
  const breedingRoyalBaseId = refs.instanceId("breedingRoyalBase");
  const battleRoyalBaseId = refs.instanceId("battleRoyalBase");

  await scenario.hand("FunBeemon");
  await page.getByRole("button", { name: "Digivolve", exact: true }).click();
  await page.locator('[data-drop="breeding-you"]').click();
  await scenario.resolveUntil(
    (state) => state.players[0]!.breeding?.topCard.instanceId === breedingRoyalBaseId && !state.pendingDecision,
  );
  expect((await scenario.snapshot()).memory).toBe(memoryBefore - 1);
  await expect(page.locator(".game-memory-gauge")).toHaveAttribute("aria-label", `Memory: +${memoryBefore - 1}`);

  await scenario.evolve("ForgeBeemon", refs.permanentId("battleBase"));
  await page
    .locator(".evo-cost-prompt__option")
    .filter({ hasText: `${memoryBefore - 1} → ${memoryBefore - 3}` })
    .click();
  await scenario.resolveUntil(
    (state) =>
      state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === battleRoyalBaseId) &&
      !state.pendingDecision,
  );
  expect((await scenario.snapshot()).memory).toBe(memoryBefore - 3);
  await expect(page.locator(".game-memory-gauge")).toHaveAttribute("aria-label", `Memory: +${memoryBefore - 3}`);
  await scenario.healthy();
});
