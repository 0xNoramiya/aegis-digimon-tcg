import fixtureHeatTrainingOptionFreeze from "../../api/src/engine/scenarios/heat-training-option-freeze.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

test("Heat Training search and placement finish and unlock the next card", async ({ scenario }) => {
  await scenario.openFixture(fixtureHeatTrainingOptionFreeze);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.play("Heat Training", "Option");
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "LM-059") && !s.pendingDecision,
    () => ({ instanceId: fixtureInstanceId("new-report-red-card") }),
  );
  const state = await scenario.snapshot();
  expect(state.memory).toBe(4);
  expect(state.players[0]!.hand.some((c) => c.instanceId === fixtureInstanceId("new-report-red-card"))).toBe(true);
  await scenario.healthy();
  const reserve = scenario.page
    .getByTestId("hand")
    .getByRole("button", { name: /^Select Monodramon(?:,|$)/ })
    .first();
  // Two Monodramon copies are equivalent; play the selected rendered copy through normal controls.
  await reserve.focus();
  await reserve.press("Enter");
  await scenario.page.getByRole("button", { name: "Play Digimon", exact: true }).click();
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-009") && !s.pendingDecision,
  );
  expect((await scenario.snapshot()).memory).toBe(2);
  await scenario.healthy();
});
