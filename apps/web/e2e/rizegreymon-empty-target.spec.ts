import fixture from "../../api/src/engine/scenarios/rizegreymon-empty-target.fixture";
import { test, expect } from "./scenario-page";

for (const acceptPlay of [true, false]) {
  test(`RizeGreymon completes its empty-board digivolution with optional play accepted=${acceptPlay}`, async ({
    scenario,
  }) => {
    const refs = await scenario.openFixture(fixture, "normal", "none");
    await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
    await scenario.evolve("RizeGreymon", refs.permanentId("base"), true);
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === refs.instanceId("rizegreymon"),
        ) &&
        state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === refs.instanceId("playable"),
        ) === acceptPlay,
      (decision) => {
        expect(decision.kind).not.toBe("chooseTargets");
        if (decision.options.purpose === "cost")
          return { instanceIds: [refs.instanceId("firstCost"), refs.instanceId("secondCost")] };
        if (decision.kind === "selectCards") return { instanceId: refs.instanceId("playable") };
        return { accept: acceptPlay };
      },
    );
    expect((await scenario.snapshot()).memory).toBe(5);
    await scenario.healthy();
  });
}
