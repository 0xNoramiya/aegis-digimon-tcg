import fixture from "../../api/src/engine/scenarios/paladin-source-stripping.fixture";
import { test, expect } from "./scenario-page";

test("Machinedramon's paid protection keeps friendly sources when Paladin ACE is played", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.play("Machinedramon", "Digimon");
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard.instanceId === refs.instanceId("machinedramon") && permanent.stack.length === 2,
      ),
    () => ({ accept: true, instanceIds: [refs.instanceId("firstMaterial"), refs.instanceId("secondMaterial")] }),
  );
  await scenario.page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === refs.instanceId("paladin")),
  );
  const state = await scenario.snapshot();
  expect(
    state.players[0]!.battleArea.find((permanent) => permanent.permanentId === refs.permanentId("ally"))!.stack.map(
      (card) => card.instanceId,
    ),
  ).toContain(refs.instanceId("allySource"));
  expect(
    state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === refs.instanceId("machinedramon"))!
      .stack,
  ).toHaveLength(2);
  await scenario.healthy();
});
