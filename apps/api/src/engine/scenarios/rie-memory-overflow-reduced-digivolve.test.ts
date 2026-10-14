import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/rie-memory-overflow-reduced-digivolve.fixture";

describe("Rie Kishibe end-of-turn digivolution after a memory overflow", () => {
  it("pays the Rie requirement cost reduced by 3 when the turn ends by spending memory", async () => {
    const s = setupScenario(fixture, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
      declinePrompts: ["Attack"],
    });
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(1);
      const paymentId = s.inst("payment").instanceId;
      const lordKnightmonId = s.inst("lordKnightmon").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("overflowPlay").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.turnSeat === 1 && s.state.pendingDecision === undefined);

      expect(s.perm("rie").topCard.instanceId).toBe(lordKnightmonId);
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(paymentId);
      const digivolvePayments = s.events.flatMap((event) =>
        event.kind === "memoryChanged" && event.reason === "digivolve" ? [event.from - event.to] : [],
      );
      expect(digivolvePayments).toEqual([2]);
      expect(s.state.memory).toBe(3);
    } finally {
      s.engine.applyIntent(1, { type: "surrender" });
      await loop;
    }
  });
});
