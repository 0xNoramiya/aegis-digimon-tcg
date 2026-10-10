import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const CRANIAMON = "dev-perm-0-feedback33-craniamon";
const HAND_CRANIAMON = "dev-feedback33-hand-craniamon";
const ZEPHAGAMON = "dev-feedback33-zephagamon";

describe("Feedback #33 Kakkinmon at the end of the opponent's turn", () => {
  it("lets an immune Craniamon pay Kakkinmon's suspend cost at the end of the opponent's turn", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [CRANIAMON] },
    );
    layDevScenario("arena-feedback33-kakkinmon-opponent-turn-end", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const craniamon = () => human.battleArea.find((permanent) => permanent.permanentId === CRANIAMON)!;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);

      expect(
        s.engine.applyIntent(0, { type: "digivolve", permanentId: CRANIAMON, instanceId: HAND_CRANIAMON }),
      ).toEqual({ ok: true });
      await settle(() => craniamon().topCard.cardId === "EX13-062" && s.state.pendingDecision === undefined);
      advance(s.engine).endMainPhaseIfOpen(0);
      await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(craniamon().isSuspended).toBe(false);
      const handBeforeOpponentTurnEnd = human.hand.length;
      expect(handBeforeOpponentTurnEnd).toBeLessThanOrEqual(7);

      const opponentTurnStart = s.events.length;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: ZEPHAGAMON })).toEqual({ ok: true });
      await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);

      const opponentTurn = s.events.slice(opponentTurnStart);
      const turnEnded = opponentTurn.findIndex((event) => event.kind === "turnEnded" && event.endingSeat === 1);
      const zephagamonResolved = opponentTurn.findIndex(
        (event) => event.kind === "effectResolved" && event.sourceCardId === "BT20-101" && event.timing === "OnPlay",
      );
      const kakkinmonResolved = opponentTurn.findIndex(
        (event) => event.kind === "effectResolved" && event.sourceCardId === "P-245",
      );
      const craniamonSuspended = opponentTurn.findIndex(
        (event) => event.kind === "cardsMoved" && event.instanceIds.includes(CRANIAMON) && event.to === "suspended",
      );
      expect(zephagamonResolved).toBeGreaterThanOrEqual(0);
      expect(craniamonSuspended).toBeGreaterThan(zephagamonResolved);
      expect(craniamonSuspended).toBeLessThan(kakkinmonResolved);
      expect(kakkinmonResolved).toBeLessThan(turnEnded);
      expect(
        opponentTurn
          .slice(craniamonSuspended, kakkinmonResolved)
          .some((event) => event.kind === "cardsMoved" && event.to === "hand" && event.seat === 0),
      ).toBe(true);
    } finally {
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      s.engine.expireMatchTimer(s.state.turnSeat);
      await loop;
    }
  });
});
