import fixture from "../../api/src/engine/scenarios/belphemon-discard-controller.fixture";
import { test, expect } from "./scenario-page";

test("Belphemon's discard prompt keeps the opponent's hand out of its candidates", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.play("Belphemon: Rage Mode", "Digimon");
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision && state.players[1]!.trash.some((card) => card.instanceId === refs.instanceId("target")),
    (decision) => {
      if (decision.kind === "selectCards") {
        expect(decision.options.candidateInstanceIds).not.toContain(refs.instanceId("opponentHand"));
        return { instanceId: refs.instanceId("ownPayment") };
      }
      return { accept: true, instanceId: refs.permanentId("target") };
    },
  );
  expect(
    (await scenario.snapshot()).players[0]!.trash.some((card) => card.instanceId === refs.instanceId("ownPayment")),
  ).toBe(true);
  await scenario.healthy();
});
