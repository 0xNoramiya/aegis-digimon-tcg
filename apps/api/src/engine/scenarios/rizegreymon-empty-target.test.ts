import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/rizegreymon-empty-target.fixture";
import "#api/cards/ST24/ST24-06";
import "#api/cards/ST24/ST24-02";
import "#api/cards/BT1/BT1-085";

it.each([true, false])(
  "RizeGreymon skips an empty DP target and completes its optional play accepted=$acceptPlay",
  async (acceptPlay) => {
    const preferred: string[] = [];
    const s = setupScenario(fixture, {
      autoAcceptOptional: acceptPlay,
      autoDeclineOptional: !acceptPlay,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: preferred,
    });
    preferred.push(s.inst("firstCost").instanceId, s.inst("secondCost").instanceId, s.inst("playable").instanceId);
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("rizegreymon").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
      expect(s.decisions.some(({ req }) => req.sourceCardId === "ST24-06" && req.kind === "chooseTargets")).toBe(false);
      expect(
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("playable").instanceId,
        ),
      ).toBe(acceptPlay);
      expect(s.perm("tamer").stack).toHaveLength(acceptPlay ? 0 : 2);
      expect(s.state.memory).toBe(5);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
