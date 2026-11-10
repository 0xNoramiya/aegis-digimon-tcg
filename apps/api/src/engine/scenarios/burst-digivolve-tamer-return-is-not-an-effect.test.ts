import { expect, it } from "vitest";
import "#api/cards/index";
import { buildBurstDigivolveTamerReturnFixture } from "#api/engine/scenarios/burst-digivolve-tamer-return-is-not-an-effect.fixture";
import { advance } from "#api/engine/testkit/advance";
import { finishTurnLoop } from "#api/engine/testkit/finishTurnLoop";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";

it.each(["BT11-033", "BT13-031", "BT25-029", "BT27-032", "BT25-087", "BT27-089"])(
  "does not treat the Tamer returned for a Burst Digivolve as an effect adding to the hand: %s",
  async (watcherCard) => {
    const s = setupScenario(buildBurstDigivolveTamerReturnFixture({ watcherCard }), { autoOrderTriggers: false });
    await s.ready();
    const player = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const host = s.perm("burstHost");
      const tamerInstanceId = s.inst("returnedTamer").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: host.permanentId,
          instanceId: s.inst("burstMode").instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });

      await settle(() => s.state.pendingDecision !== undefined);
      const playPrompt = s.decisions.at(-1)!.req;
      expect(playPrompt).toMatchObject({ seat: 0, kind: "optional", sourceCardId: "BT13-020" });
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: playPrompt.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);

      expect(s.decisions).toHaveLength(1);
      expect(
        s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === watcherCard),
      ).toEqual([]);
      expect(host.topCard.cardId).toBe("BT13-020");
      expect(player.battleArea.map((permanent) => permanent.permanentId)).toEqual([host.permanentId]);
      expect(player.hand.map((card) => card.instanceId)).toContain(tamerInstanceId);
      expect(player.hand).toHaveLength(6);
      expect(s.perm("handWatcher").isSuspended).toBe(false);
      expect(opponent.hand.map((card) => card.instanceId)).toEqual([s.inst("playableTamer").instanceId]);
      expect(opponent.battleArea).toHaveLength(1);
      expect(s.state.memory).toBe(3);
      expect(s.state.turnSeat).toBe(0);
    } finally {
      await finishTurnLoop({ setup: s, loop });
    }
  },
);
