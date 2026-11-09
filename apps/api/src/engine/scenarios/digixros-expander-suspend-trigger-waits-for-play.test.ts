import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle, settleAcrossTimers } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/digixros-expander-suspend-trigger-waits-for-play.fixture";

describe("DigiXros expander suspension triggers", () => {
  it("waits for the DigiXros play and its [On Play] before the opponent's suspension watcher activates", async () => {
    const s = setupScenario(fixture);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.phase === Phase.Main);
      const handBeforePlay = s.state.players[0]!.hand.length;

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("shoutmonX4").instanceId,
          digiXros: {
            materialInstanceIds: [s.inst("shoutmon").instanceId, s.inst("ballistamon").instanceId],
            expanderPermanentIds: [s.perm("taiki").permanentId],
          },
        }),
      ).toEqual({ ok: true });

      await settleAcrossTimers(() => s.state.pendingDecision?.seat === 1);
      expect(s.decisions.at(-1)!.req).toMatchObject({ seat: 1, kind: "optional", sourceCardId: "BT26-049" });
      const shoutmonX4 = s.state.players[0]!.battleArea.find(
        ({ topCard }) => topCard.instanceId === s.inst("shoutmonX4").instanceId,
      );
      expect(shoutmonX4?.stack.map(({ instanceId }) => instanceId)).toEqual(
        expect.arrayContaining([s.inst("shoutmon").instanceId, s.inst("ballistamon").instanceId]),
      );
      expect(s.perm("taiki").isSuspended).toBe(true);
      expect(s.state.memory).toBe(2);
      expect(s.state.players[0]!.hand).toHaveLength(handBeforePlay - 1 + 2);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
