import fixtureParkourSequential from "./parkour-sequential.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";

describe("Parkour Training sequential color requirements", () => {
  it("ends its waiver after placement, refuses the second copy without green, and accepts it with a dual-color Tamer", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureParkourSequential, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    const human = s.state.players[0]!;
    try {
      // An existing level-2 egg cannot move or hatch: production skips its Breeding window.
      await advance(s.engine).waitForMainPhase(0);
      expect(human.breeding?.topCard.cardId).toBe("BT12-002");
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("first-card") })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          human.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("first-card")) &&
          !s.state.pendingDecision,
      );
      await drainMicrotasks();
      expect(s.state.memory).toBe(6);
      expect(human.hand.map((c) => c.instanceId)).toContain(fixtureInstanceId("deck-1-card"));
      expect(human.deck.at(-1)?.instanceId).toBe(fixtureInstanceId("deck-2-card"));
      const before = human.hand.map((c) => c.instanceId);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("second-card") })).toEqual({
        ok: false,
        reason: "color-requirement-unmet",
      });
      expect(s.state.memory).toBe(6);
      expect(human.hand.map((c) => c.instanceId)).toEqual(before);
      expect(human.trash).toHaveLength(0);
      expect(human.battleArea).toHaveLength(1);
      expect(JSON.parse(human.battleArea[0]!.activatableEffectsJson || "[]")).toEqual([]);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("deck-1-card") })).toEqual({
        ok: true,
      });
      await settle(() => human.battleArea.some((p) => p.topCard.cardId === "BT16-085") && !s.state.pendingDecision);
      await drainMicrotasks();
      expect(s.state.memory).toBe(2);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("second-card") })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          human.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("second-card")) &&
          !s.state.pendingDecision,
      );
      await drainMicrotasks();
      expect(s.state.memory).toBe(0);
      expect(s.state.turnSeat).toBe(0);
      expect(s.state.phase).toBe(Phase.Main);
      expect(human.battleArea.map((p) => p.topCard.cardId)).toEqual(["LM-058", "BT16-085", "LM-058"]);
      expect(human.hand.map((c) => c.instanceId)).toEqual([
        fixtureInstanceId("deck-0-card"),
        fixtureInstanceId("deck-3-card"),
      ]);
      expect(human.deck.slice(-2).map((c) => c.instanceId)).toEqual([
        fixtureInstanceId("deck-2-card"),
        fixtureInstanceId("deck-4-card"),
      ]);
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
