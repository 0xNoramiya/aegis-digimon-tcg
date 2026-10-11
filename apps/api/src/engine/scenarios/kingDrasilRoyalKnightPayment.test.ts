import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it.each([
  { source: "BT13-007", declineFirst: false },
  { source: "BT1-001", declineFirst: false },
  { source: "BT13-007", declineFirst: true },
])(
  "Feedback #61 continuity: $source source, first payment declined=$declineFirst",
  async ({ source, declineFirst }) => {
    const declinePrompts = declineFirst ? ["reduce"] : [];
    const s = setupEngine(
      {
        0: {
          eggDeck: [
            { card: "BT13-007", as: "top" },
            { card: source, as: "source" },
          ],
          hand: [
            { card: "BT13-040", as: "first" },
            { card: "BT13-040", as: "second" },
            { card: "BT1-009", as: "reserve" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const egg = s.state.players[0]!.breeding!;
      expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: egg.permanentId }).ok).toBe(false);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.battleArea.length === 1 &&
          !s.state.pendingDecision &&
          s.engine.mainVerbContinuationsInFlight === 0,
      );
      expect(s.state.memory).toBe(declineFirst ? 3 : 8); // printed7 minus4 minus one source, only when paid
      declinePrompts.length = 0;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.battleArea.length === 2 &&
          !s.state.pendingDecision &&
          s.engine.mainVerbContinuationsInFlight === 0,
      );
      expect(s.state.memory).toBe(1);
      expect(s.events.filter((e) => e.kind === "memoryChanged" && e.reason === "payCost")).toEqual([
        { kind: "memoryChanged", from: 10, to: declineFirst ? 3 : 8, reason: "payCost" },
        { kind: "memoryChanged", from: declineFirst ? 3 : 8, to: 1, reason: "payCost" },
      ]);
      expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT13-007")).toHaveLength(
        declineFirst ? 2 : 1,
      );
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([
        s.inst("first").instanceId,
        s.inst("second").instanceId,
      ]);
      expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([s.inst("reserve").instanceId]);
      expect(egg.topCard.instanceId).toBe(s.inst("top").instanceId);
      expect(egg.stack.map((c) => c.instanceId)).toEqual([s.inst("source").instanceId]);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Main);
      expect(s.state.memory).toBe(3);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
