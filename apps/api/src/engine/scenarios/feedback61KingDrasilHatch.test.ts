import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { canHatch } from "../actions/breeding.js";

it.each(["BT13-007", "BT18-004", "EX2-007"])(
  "Feedback #61: public hatch accepts %s regardless of printed level",
  async (card) => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [
            { card, as: "top" },
            { card, as: "second" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    const top = s.inst("top").instanceId;
    const second = s.inst("second").instanceId;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      const memory = s.state.memory;
      const deck = s.state.players[0]!.deck.length;
      expect(canHatch(s.state, 0)).toBe(true);
      expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
      expect(s.engine.applyIntent(0, { type: "hatchEgg" }).ok).toBe(false);
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.players[0]!.breeding!.topCard.instanceId).toBe(top);
      expect(s.state.players[0]!.breeding!.topCard.faceUp).toBe(true);
      expect(s.state.players[0]!.breeding!.inBreeding).toBe(true);
      expect(s.state.memory).toBe(memory);
      expect(s.state.players[0]!.deck).toHaveLength(deck);
      expect(s.events.filter((e) => e.kind === "hatched")).toHaveLength(1);
      // King Drasil's mandatory StartMain consumes the next egg as a source.
      expect(s.state.players[0]!.eggDeck.map((c) => c.instanceId)).toEqual(card === "BT13-007" ? [] : [second]);
      expect(s.state.players[0]!.breeding!.stack.map((c) => c.instanceId)).toEqual(card === "BT13-007" ? [second] : []);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

it.each([
  { name: "occupied breeding", eggs: ["BT13-007"], breeding: { card: "BT13-007" }, phase: Phase.Breeding, seat: 0 },
  { name: "empty egg deck", eggs: [], breeding: undefined, phase: Phase.Breeding, seat: 0 },
  { name: "wrong turn", eggs: ["BT13-007"], breeding: undefined, phase: Phase.Breeding, seat: 1 },
  { name: "outside breeding", eggs: ["BT13-007"], breeding: undefined, phase: Phase.Main, seat: 0 },
] as const)("Feedback #61: public hatch refuses $name without consuming cards", async (c) => {
  const s = setupEngine({ 0: { eggDeck: [...c.eggs], breeding: c.breeding } });
  s.state.phase = c.phase;
  const eggIds = s.state.players[0]!.eggDeck.map((card) => card.instanceId);
  const breedingId = s.state.players[0]!.breeding?.topCard.instanceId;
  expect(s.engine.applyIntent(c.seat, { type: "hatchEgg" }).ok).toBe(false);
  expect(s.state.players[0]!.eggDeck.map((card) => card.instanceId)).toEqual(eggIds);
  expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(breedingId);
  expect(s.events.some((e) => e.kind === "hatched")).toBe(false);
});
