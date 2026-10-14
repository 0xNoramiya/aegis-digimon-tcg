import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/royal-base-breeding-digivolve-full-cost.fixture";

describe("Royal Base security digivolution cost reduction", () => {
  it("leaves breeding-area digivolutions at full cost and keeps the reduction for the battle area", async () => {
    const s = setupScenario(fixture);
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.state.pendingDecision === undefined);
      const memoryBefore = s.state.memory;
      const breedingRoyalBaseId = s.inst("breedingRoyalBase").instanceId;
      const battleRoyalBaseId = s.inst("battleRoyalBase").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("breedingBase").permanentId,
          instanceId: breedingRoyalBaseId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.breeding?.topCard.instanceId === breedingRoyalBaseId &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.memory).toBe(memoryBefore - 1);

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("battleBase").permanentId,
          instanceId: battleRoyalBaseId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.perm("battleBase").topCard.instanceId === battleRoyalBaseId && s.state.pendingDecision === undefined,
      );
      expect(s.state.memory).toBe(memoryBefore - 1 - 2);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
