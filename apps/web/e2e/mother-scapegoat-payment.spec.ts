import fixture from "../../api/src/engine/scenarios/mother-scapegoat-payment.fixture";
import { test, expect } from "./scenario-page";

test("Scapegoat pays by deleting Mother despite her opponent-effect immunity", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil(
    (state) =>
      state.players[0]!.trash.some((card) => card.instanceId === refs.instanceId("mother")) && !state.pendingDecision,
    () => ({ instanceId: refs.instanceId("mother") }),
  );
  expect((await scenario.snapshot()).players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
    "LM-043",
  ]);
  expect(
    (await scenario.presentation()).events.some(
      (event) => event.kind === "deletionPrevented" && event.keyword === "Scapegoat",
    ),
  ).toBe(true);
  await scenario.healthy();
});
