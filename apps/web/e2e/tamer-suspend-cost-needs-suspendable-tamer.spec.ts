import { tamerSuspendCostNeedsSuspendableTamer } from "../../api/src/engine/scenarios/tamer-suspend-cost-needs-suspendable-tamer.fixture";
import { test, expect } from "./scenario-page";

const TAI = "BT12-095";
const DIGIVOLVE_COST = 2;

for (const { lock, title, taiPrompts, memoryGain } of [
  { lock: "none", title: "suspends Tai to gain 1 memory", taiPrompts: 1, memoryGain: 1 },
  { lock: "cantSuspend", title: "offers no memory gain when Tai can't suspend", taiPrompts: 0, memoryGain: 0 },
] as const) {
  test(`Tai Kamiya ${title}`, async ({ scenario }) => {
    const refs = await scenario.openFixture(tamerSuspendCostNeedsSuspendableTamer(lock));
    const tai = refs.permanentId("tai");
    const agumon = refs.permanentId("agumon");
    await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
    const before = await scenario.snapshot();
    const promptsBefore = (await scenario.presentation()).decisions.length;

    await scenario.evolve("Greymon", agumon);
    await scenario.resolveUntil(
      (state) =>
        state.players[0]!.battleArea.find((permanent) => permanent.permanentId === agumon)?.topCard?.cardId ===
          "ST1-07" && !state.pendingDecision,
      () => ({ accept: true }),
    );

    const after = await scenario.snapshot();
    const taiDecisions = (await scenario.presentation()).decisions
      .slice(promptsBefore)
      .filter((decision) => decision.sourceCardId === TAI);
    expect(taiDecisions).toHaveLength(taiPrompts);
    expect(after.memory).toBe(before.memory - DIGIVOLVE_COST + memoryGain);
    expect(after.players[0]!.battleArea.find((permanent) => permanent.permanentId === tai)!.isSuspended).toBe(
      memoryGain === 1,
    );
    await scenario.healthy();
  });
}
