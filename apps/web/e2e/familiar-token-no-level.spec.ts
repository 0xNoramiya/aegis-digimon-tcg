import fixture from "../../api/src/engine/scenarios/familiar-token-no-level.fixture";
import { test, expect } from "./scenario-page";

test("AeroVeedramon's level-based return leaves the level-less Familiar Token on the field", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.play("AeroVeedramon", "Digimon");
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === refs.instanceId("aeroveedramon"),
      ),
    (decision) => {
      expect(decision.kind).not.toBe("chooseTargets");
      return {};
    },
  );
  const state = await scenario.snapshot();
  expect(state.memory).toBe(3);
  expect(state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
    refs.permanentId("familiar"),
  ]);
  await scenario.healthy();
});
