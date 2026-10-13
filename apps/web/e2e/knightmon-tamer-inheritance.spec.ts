import fixture from "../../api/src/engine/scenarios/knightmon-tamer-inheritance.fixture";
import { test, expect } from "./scenario-page";

test("Knightmon beneath Rie does not offer an inherited effect when another Digimon attacks", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil(
    (state) => state.players[0]!.securityCount === 4 && !state.pendingDecision && !state.combatWindow,
  );
  expect(
    (await scenario.snapshot()).players[0]!.hand.some((card) => card.instanceId === refs.instanceId("playable")),
  ).toBe(true);
  expect((await scenario.presentation()).decisions.some((decision) => decision.sourceCardId === "P-111")).toBe(false);
  await scenario.healthy();
});
