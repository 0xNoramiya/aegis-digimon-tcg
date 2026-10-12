import fixture from "../../api/src/engine/scenarios/medieval-other-suspended-deletion.fixture";
import { test, expect } from "./scenario-page";

for (const extraSuspended of [false, true]) {
  test(`MedievalGallantmon counts other suspended Digimon for its deletion with extra suspended=${extraSuspended}`, async ({
    scenario,
  }) => {
    const prepared = {
      ...fixture,
      board: {
        ...fixture.board,
        1: {
          ...fixture.board[1],
          battleArea: [
            { card: "BT26-079", as: "target" },
            ...(extraSuspended ? [{ card: "BT1-009", as: "extra", suspended: true }] : []),
          ],
        },
      },
    };
    const refs = await scenario.openFixture(prepared, "normal", "none");
    await scenario.resolveUntil((state) => state.phase === "Main" && state.turnSeat === 0 && !state.pendingDecision);
    expect((await scenario.snapshot()).players[1]!.battleArea[0]!.currentDP).toBe(15000);
    await scenario.play("MedievalGallantmon", "Digimon");
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        state.memory === 0 &&
        state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === refs.instanceId("medieval") && permanent.isSuspended,
        ) &&
        state.players[1]!.trash.some((card) => card.instanceId === refs.instanceId("target")) === extraSuspended,
      (decision) => {
        if ((decision.options.min ?? 0) > 1)
          return { instanceIds: [refs.permanentId("ally"), refs.permanentId("target")] };
        if (decision.options.targetFate === "suspend") return { instanceId: decision.sourcePermanentId };
        if (decision.options.targetFate === "delete") return { instanceId: refs.permanentId("target") };
        return { accept: true };
      },
    );
    const state = await scenario.snapshot();
    expect(state.players[1]!.trash.some((card) => card.instanceId === refs.instanceId("target"))).toBe(extraSuspended);
    const presentation = await scenario.presentation();
    expect(
      presentation.decisions.some(
        (decision) => decision.sourceCardId === "EX8-074" && decision.options?.targetFate === "delete",
      ),
    ).toBe(extraSuspended);
    await scenario.healthy();
  });
}
