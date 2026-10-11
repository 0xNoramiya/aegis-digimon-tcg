import fixtureOmnimonNameDna from "./omnimon-name-dna.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";

describe("AD1 Omnimon substring-name DNA", () => {
  it("projects the reported level-6 pair, refuses a level-4 name match, and merges both full stacks for zero cost", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureOmnimonNameDna, [BLUE_DECK, RED_DECK], true);
    const human = s.state.players[0]!;
    const [grey, garuru, low, wrongName] = human.battleArea;
    const greyCards = [...grey!.stack, grey!.topCard].map((c) => c.instanceId);
    const garuruCards = [...garuru!.stack, garuru!.topCard].map((c) => c.instanceId);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const omnimon = human.hand.find((c) => c.instanceId === fixtureInstanceId("omnimon-card"))!;
      expect(
        [...omnimon.dnaDigivolveRoutes].map((r) => ({
          ids: JSON.parse(r.materialPermanentIdsJson),
          cost: r.projectedCost,
        })),
      ).toEqual([{ ids: [grey!.permanentId, garuru!.permanentId], cost: 0 }]);
      const handBefore = human.hand.map((c) => c.instanceId);
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          instanceId: omnimon.instanceId,
          materialPermanentIds: [grey!.permanentId, low!.permanentId],
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(s.state.memory).toBe(2);
      expect(human.hand.map((c) => c.instanceId)).toEqual(handBefore);
      expect(human.battleArea).toHaveLength(4);
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          instanceId: omnimon.instanceId,
          materialPermanentIds: [wrongName!.permanentId, garuru!.permanentId],
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(s.state.memory).toBe(2);
      expect(human.hand.map((c) => c.instanceId)).toEqual(handBefore);
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          instanceId: omnimon.instanceId,
          materialPermanentIds: [garuru!.permanentId, grey!.permanentId],
        }),
      ).toEqual({ ok: true });
      await settle(
        () => human.battleArea.some((p) => p.topCard.instanceId === omnimon.instanceId) && !s.state.pendingDecision,
      );
      await drainMicrotasks();
      const result = human.battleArea.find((p) => p.topCard.instanceId === omnimon.instanceId)!;
      expect(result.stack.map((c) => c.instanceId)).toEqual([...garuruCards, ...greyCards]);
      expect(result.stack.map((c) => c.cardId)).toEqual([
        "AD1-010",
        "EX9-019",
        "AD1-012",
        "ST21-01",
        "ST20-10",
        "AD1-001",
        "EX9-012",
        "AD1-009",
      ]);
      expect(human.battleArea.map((p) => p.topCard.cardId)).toEqual(["AD1-025", "BT1-036", "BT2-020"]);
      expect(result.isSuspended).toBe(false);
      expect(result.currentDP).toBe(19000);
      expect(human.trash).toHaveLength(0);
      expect(human.hand.map((c) => c.instanceId)).toEqual([
        fixtureInstanceId("effects-deck-0-0-card"),
        fixtureInstanceId("effects-deck-0-1-card"),
      ]);
      expect(s.state.memory).toBe(2);
      expect(s.state.turnSeat).toBe(0);
      expect(s.state.phase).toBe(Phase.Main);
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
