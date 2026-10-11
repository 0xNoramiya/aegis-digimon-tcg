import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";

describe("Feedback #42 Parkour Training sequential color requirements", () => {
  it("ends its waiver after placement, refuses the second copy without green, and accepts it with a dual-color Tamer", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
    layDevScenario("arena-feedback42-parkour-sequential", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    const human = s.state.players[0]!;
    try {
      // An existing level-2 egg cannot move or hatch: production skips its Breeding window.
      await advance(s.engine).waitForMainPhase(0);
      expect(human.breeding?.topCard.cardId).toBe("BT12-002");
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "feedback42-first" })).toEqual({ ok: true });
      await settle(
        () => human.battleArea.some((p) => p.topCard.instanceId === "feedback42-first") && !s.state.pendingDecision,
      );
      await drainMicrotasks();
      expect(s.state.memory).toBe(6);
      expect(human.hand.map((c) => c.instanceId)).toContain("feedback42-deck-1");
      expect(human.deck.at(-1)?.instanceId).toBe("feedback42-deck-2");
      const before = human.hand.map((c) => c.instanceId);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "feedback42-second" })).toEqual({
        ok: false,
        reason: "color-requirement-unmet",
      });
      expect(s.state.memory).toBe(6);
      expect(human.hand.map((c) => c.instanceId)).toEqual(before);
      expect(human.trash).toHaveLength(0);
      expect(human.battleArea).toHaveLength(1);
      expect(JSON.parse(human.battleArea[0]!.activatableEffectsJson || "[]")).toEqual([]);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "feedback42-deck-1" })).toEqual({ ok: true });
      await settle(() => human.battleArea.some((p) => p.topCard.cardId === "BT16-085") && !s.state.pendingDecision);
      await drainMicrotasks();
      expect(s.state.memory).toBe(2);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "feedback42-second" })).toEqual({ ok: true });
      await settle(
        () => human.battleArea.some((p) => p.topCard.instanceId === "feedback42-second") && !s.state.pendingDecision,
      );
      await drainMicrotasks();
      expect(s.state.memory).toBe(0);
      expect(s.state.turnSeat).toBe(0);
      expect(s.state.phase).toBe(Phase.Main);
      expect(human.battleArea.map((p) => p.topCard.cardId)).toEqual(["LM-058", "BT16-085", "LM-058"]);
      expect(human.hand.map((c) => c.instanceId)).toEqual(["feedback42-deck-0", "feedback42-deck-3"]);
      expect(human.deck.slice(-2).map((c) => c.instanceId)).toEqual(["feedback42-deck-2", "feedback42-deck-4"]);
      expect(human.trash).toHaveLength(0);
      expect(
        human.battleArea
          .filter((p) => p.topCard.cardId === "LM-058")
          .every((p) => JSON.parse(p.activatableEffectsJson || "[]").length === 0),
      ).toBe(true);
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
