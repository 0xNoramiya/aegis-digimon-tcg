import fixture from "../../api/src/engine/scenarios/king-drasil-opponent-royal-knight-option-memory.fixture";
import { test, expect } from "./scenario-page";

test.use({ holdBotAfterTurn: 1 });

test("King Drasil_7D6's inherited effect gains memory from the opponent's checked Royal Knight Option", async ({
  scenario,
  page,
}) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  const memoryBefore = (await scenario.snapshot()).memory;
  const royalPurgeId = refs.instanceId("royalPurge");

  await scenario.attack(refs.permanentId("attacker"));
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      !state.combatWindow &&
      state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === royalPurgeId),
  );

  const final = await scenario.snapshot();
  expect(final.memory).toBe(memoryBefore + 1);
  expect(final.turnSeat).toBe(0);
  await expect(page.locator(".game-memory-gauge")).toHaveAttribute("aria-label", `Memory: +${memoryBefore + 1}`);
  await scenario.healthy();
});
