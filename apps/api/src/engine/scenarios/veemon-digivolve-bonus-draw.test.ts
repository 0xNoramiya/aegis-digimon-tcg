import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/veemon-digivolve-bonus-draw.fixture";
import "#api/cards/BT12/BT12-021";
import "#api/cards/BT12/BT12-050";

it("draws the digivolution bonus when Veemon digivolves into Stingmon from hand", async () => {
  const s = setupScenario(fixture);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const player = s.state.players[0]!;
    expect(player.hand.map((card) => card.instanceId)).toEqual([
      s.inst("stingmon").instanceId,
      s.inst("turnDraw").instanceId,
    ]);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("stingmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);

    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("stingmon").instanceId);
    expect(player.hand.map((card) => card.instanceId)).toEqual([
      s.inst("turnDraw").instanceId,
      s.inst("bonusDraw").instanceId,
    ]);
    expect(player.deck).toHaveLength(10);
    expect(s.state.memory).toBe(2);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
