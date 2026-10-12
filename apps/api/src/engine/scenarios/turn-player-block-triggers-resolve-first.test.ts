import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { settle, settleAcrossTimers } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/turn-player-block-triggers-resolve-first.fixture";

describe("Turn player block triggers resolve first", () => {
  it("resolves the attacker's target-change effect before the blocker's suspension effect", async () => {
    const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    const loop = s.engine.runOneTurn();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);

      const nezhamon = s.perm("nezhamon").permanentId;
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: nezhamon, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(() => s.state.combatWindow?.kind === "block");
      expect(
        s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("gankoomon").permanentId }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      const resolutionOrder = s.events.flatMap((event) =>
        event.kind === "effectResolved" && (event.sourceCardId === "EX12-019" || event.sourceCardId === "EX13-061")
          ? [event.sourceCardId]
          : [],
      );
      expect(resolutionOrder).toEqual(["EX12-019", "EX13-061"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX12-019");
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
        expect.arrayContaining(["EX13-066", "EX13-061"]),
      );
      const survivor = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === nezhamon);
      expect(survivor?.topCard.instanceId).toBe(s.inst("metalTyrannomon").instanceId);
      expect(survivor?.currentDP).toBe(14000);
      expect(survivor?.immuneToOpponentDigimonEffects).toBe(true);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
