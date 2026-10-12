import fixture from "../../api/src/engine/scenarios/guard-decode-payment.fixture";
import { test, expect } from "./scenario-page";

test("Guard offers Decode from its own stack when paying for another Digimon", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.play("Gaia Force", "Option");
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      state.players[0]!.trash.some((card) => card.instanceId === refs.instanceId("removal")) &&
      state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === refs.instanceId("decoded")),
    () => ({ instanceId: refs.permanentId("target") }),
  );
  const state = await scenario.snapshot();
  const guardSurvived = state.players[1]!.battleArea.some(
    (permanent) => permanent.permanentId === refs.permanentId("guard"),
  );
  expect(state.players[1]!.trash.some((card) => card.instanceId === refs.instanceId("target"))).toBe(guardSurvived);
  await scenario.healthy();
});
