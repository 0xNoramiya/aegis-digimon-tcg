import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/familiar-token-no-level.fixture";
import "#api/cards/BT22/BT22-023";

it("a level-based return can't choose a Familiar Token because it has no level", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    const familiarId = s.perm("familiar").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aeroveedramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT22-023") &&
        s.engine.mainVerbContinuationsInFlight === 0 &&
        !s.state.pendingDecision,
    );
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([familiarId]);
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});
