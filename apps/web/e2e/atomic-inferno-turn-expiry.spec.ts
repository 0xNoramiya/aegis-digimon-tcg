import fixture from "../../api/src/engine/scenarios/atomic-inferno-turn-expiry.fixture";
import { test, expect } from "./scenario-page";

test("Atomic Inferno's blocked memory gain expires before the next own turn", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.play("Atomic Inferno", "Option");
  await scenario.resolveUntil(
    (state) =>
      state.players[0]!.trash.some((card) => card.instanceId === refs.instanceId("option")) && !state.pendingDecision,
  );
  const firstMemory = (await scenario.snapshot()).memory;
  await scenario.attack(refs.permanentId("hybrid"));
  await scenario.resolveUntil(
    (state) => state.players[1]!.battleArea.length === 1 && !state.combatWindow && !state.pendingDecision,
  );
  expect((await scenario.snapshot()).memory).toBe(firstMemory + 3);
  await scenario.page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil(
    (state) => state.turnSeat === 0 && state.turnCount === 6 && state.phase === "Main" && !state.pendingDecision,
  );
  const laterMemory = (await scenario.snapshot()).memory;
  await scenario.attack(refs.permanentId("hybrid"));
  await scenario.resolveUntil(
    (state) => state.players[1]!.battleArea.length === 0 && !state.combatWindow && !state.pendingDecision,
  );
  expect((await scenario.snapshot()).memory).toBe(laterMemory);
  expect((await scenario.presentation()).events.filter((event) => event.kind === "blocked")).toHaveLength(2);
  await scenario.healthy();
});
