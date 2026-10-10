import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const RUIN_MODE_CARD = "dev-field-1-feedback20-ruin-mode";
const MONODRAMON_CARD = "dev-field-1-feedback20-monodramon";
const DELETE_OPTION = "dev-feedback20-delete-option";
const KUWAGAMON = "dev-feedback20-kuwagamon";
const LILLYMON = "dev-feedback20-lillymon";

describe("Feedback #20 playable Ruin Mode lingering DP scenario", () => {
  it("deletes a 4000-DP play before its On Play (Q3523) but lets an 8000-DP play resolve its On Play", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-feedback20-ruin-mode-on-play", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const triggered = (cardId: string) =>
      s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === cardId);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: DELETE_OPTION })).toEqual({ ok: true });
      await settle(
        () =>
          opponent.trash.some((card) => card.instanceId === RUIN_MODE_CARD) &&
          s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX4-074") &&
          s.state.pendingDecision === undefined,
      );
      expect(opponent.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([MONODRAMON_CARD]);

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: KUWAGAMON })).toEqual({ ok: true });
      await settle(
        () => human.trash.some((card) => card.instanceId === KUWAGAMON) && s.state.pendingDecision === undefined,
      );
      expect(triggered("BT1-070")).toBe(false);
      expect(opponent.battleArea[0]?.isSuspended).toBe(false);
      expect(s.state.memory).toBe(2);

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: LILLYMON })).toEqual({ ok: true });
      await settle(() =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT14-049"),
      );
      const lillymon = human.battleArea.find((permanent) => permanent.topCard.instanceId === LILLYMON);
      expect(lillymon?.currentDP).toBe(3000);
      expect(opponent.battleArea).toHaveLength(0);
      expect(opponent.deck.at(-1)?.instanceId).toBe(MONODRAMON_CARD);
    } finally {
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      // Lillymon spends the last memory, so the loop may wait in the opponent's breeding phase.
      s.engine.expireMatchTimer(s.state.turnSeat);
      await loop;
    }
  });
});
