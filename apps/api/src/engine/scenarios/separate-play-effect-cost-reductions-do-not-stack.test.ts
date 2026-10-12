import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/separate-play-effect-cost-reductions-do-not-stack.fixture";

const PLUTOMON_DIGIVOLVE_COST = 4;
const ZOMBIEPLUTOMON_COST_AFTER_PLUTOMON_REDUCTION = 12 - 7;

describe("separate play effect cost reductions do not stack", () => {
  it("plays ZombiePlutomon through Plutomon for 5 memory without its own Trash Main reduction", async () => {
    const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true });
    const loop = s.engine.runOneTurn();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const memoryBefore = s.state.memory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("levelFiveTitan").permanentId,
          instanceId: s.inst("plutomon").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      const zombiePlutomonId = s.inst("zombiePlutomon").instanceId;
      await settle(
        () =>
          s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === zombiePlutomonId) &&
          s.state.pendingDecision === undefined,
      );

      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
        s.inst("discardedCard").instanceId,
      );
      expect(s.state.memory).toBe(
        memoryBefore - PLUTOMON_DIGIVOLVE_COST - ZOMBIEPLUTOMON_COST_AFTER_PLUTOMON_REDUCTION,
      );
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
