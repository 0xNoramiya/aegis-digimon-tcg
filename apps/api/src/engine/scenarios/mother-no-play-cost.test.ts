import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/mother-no-play-cost.fixture";
import "#api/cards/EX2/EX2-007";
import "#api/cards/LM/LM-043";

it("Mother has no play cost and does not shield other Digimon from lowest-cost deletion", async () => {
  const s = setupScenario(fixture, { autoSelectCards: true });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("darkdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("lowestCost").instanceId) &&
        !s.state.pendingDecision,
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX2-007"]);
  } finally {
    s.engine.applyIntent(1, { type: "surrender" });
    await loop;
  }
});
