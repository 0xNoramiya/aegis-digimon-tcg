import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/king-drasil-opponent-royal-knight-option-memory.fixture";

describe("King Drasil_7D6 inherited Royal Knight Option watcher", () => {
  it("gains 1 memory when the opponent's checked Royal Knight Option is placed in their battle area", async () => {
    const s = setupScenario(fixture);
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.state.pendingDecision === undefined);
      const memoryBefore = s.state.memory;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.events.some((event) => event.kind === "attackEnded") && s.state.pendingDecision === undefined,
      );

      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
        s.inst("royalPurge").instanceId,
      );
      expect(s.state.memory).toBe(memoryBefore + 1);
      expect(s.state.turnSeat).toBe(0);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
