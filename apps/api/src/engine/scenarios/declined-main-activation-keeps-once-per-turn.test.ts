import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/declined-main-activation-keeps-once-per-turn.fixture";

const restackPrompt = "By placing this [CS] trait Digimon's top stacked card";

describe("Declined [Main] activation keeps its [Once Per Turn] use", () => {
  it("offers the inherited restack again after the player declined it and attacked security", async () => {
    const declinePrompts = [restackPrompt, "change orientation"];
    const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, declinePrompts });
    const loop = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const host = s.perm("ulforceHost");
      const terriermon = s.inst("terriermonSource");
      const view = observe(s.engine);
      const restack = () =>
        view.activatableEffects(host).find(({ instanceId }) => instanceId === terriermon.instanceId);
      const activateRestack = () =>
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: terriermon.instanceId,
          effectKey: restack()!.effectKey,
        });

      expect(restack()).toBeDefined();
      expect(activateRestack()).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);
      expect(host.topCard.instanceId).toBe(s.inst("ulforceHost").instanceId);
      expect(restack()).toBeDefined();

      const opponentSecurityBefore = s.state.players[1]!.security.length;
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[1]!.security.length === opponentSecurityBefore - 1 &&
          s.engine.mainVerbContinuationsInFlight === 0 &&
          s.state.pendingDecision === undefined &&
          s.state.phase === Phase.Main,
      );
      expect(host.isSuspended).toBe(true);
      expect(restack()).toBeDefined();

      declinePrompts.splice(0, declinePrompts.length, "change orientation");
      const handBefore = s.state.players[0]!.hand.length;
      expect(activateRestack()).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);
      expect(host.topCard.instanceId).toBe(s.inst("upperAngemon").instanceId);
      expect(host.stack[0]!.instanceId).toBe(s.inst("ulforceHost").instanceId);
      expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
      expect(restack()).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
