import fixture from "../../api/src/engine/scenarios/mother-no-play-cost.fixture";
import { test, expect } from "./scenario-page";

test("Mother is excluded from play-cost comparison while the lowest-cost Digimon is deleted", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil(
    (state) =>
      state.players[0]!.trash.some((card) => card.instanceId === refs.instanceId("lowestCost")) &&
      !state.pendingDecision,
  );
  expect((await scenario.snapshot()).players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
    "EX2-007",
  ]);
  await scenario.healthy();
});
