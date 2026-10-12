import fixture from "../../api/src/engine/scenarios/truskmore-independent-targets.fixture";
import { test, expect } from "./scenario-page";

test("Truskmore uses separate targets for suspension and the unsuspend lock", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.attack(refs.permanentId("own"));
  await scenario.resolveUntil(
    (state) =>
      state.players[1]!.securityCount < 5 &&
      !state.combatWindow &&
      state.players[0]!.battleArea[0]!.isSuspended &&
      !state.pendingDecision,
  );
  await scenario.play("Diarbbitmon", "Option");
  await scenario.page.getByRole("button", { name: "Use as Option", exact: true }).click();
  let opponentSelection = 0;
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision && state.players[0]!.trash.some((card) => card.instanceId === refs.instanceId("option")),
    (decision) => {
      if (decision.kind === "selectCards") return { accept: false };
      if (decision.options.targetFate === "unsuspend") return { instanceId: refs.permanentId("own") };
      opponentSelection += 1;
      if (opponentSelection === 1) {
        expect(decision.options.candidateInstanceIds).not.toContain(refs.permanentId("lockTamer"));
        return { instanceIds: [refs.permanentId("suspendFirst"), refs.permanentId("suspendSecond")] };
      }
      expect(decision.options.candidateInstanceIds).toContain(refs.permanentId("lockTamer"));
      return { instanceIds: [refs.permanentId("lockDigimon"), refs.permanentId("lockTamer")] };
    },
  );
  expect(opponentSelection).toBe(2);
  const state = await scenario.snapshot();
  expect(state.players[0]!.battleArea[0]!.isSuspended).toBe(false);
  expect(
    state.players[1]!.battleArea.find((permanent) => permanent.permanentId === refs.permanentId("suspendFirst"))!
      .isSuspended,
  ).toBe(true);
  await scenario.healthy();
});
