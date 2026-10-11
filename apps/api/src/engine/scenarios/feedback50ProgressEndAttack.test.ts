/* oxlint-disable vitest/no-conditional-expect -- Fixed table modes select independent printed-rule contracts. */
import { expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

it.each(["pay", "decline", "one-card"] as const)(
  "Feedback #50: Belphemon %s controls attack timing independently of Medusamon's Progress",
  async (mode) => {
    const s = setupEngine({
      autoSelectCards: true,
      autoDeclineOptional: mode === "decline",
      declinePrompts: ["＜Raid＞"],
      preferInstanceIds: ["feedback50-cost-a", "feedback50-cost-b"],
    });
    layDevScenario("arena-feedback50-progress-end-attack", s.state, [RED_DECK, BLUE_DECK]);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    if (mode === "one-card") human.hand.splice(1);
    // The paid case also reproduces the production board's unsuspended Raid target.
    if (mode === "pay") human.battleArea[0]!.isSuspended = false;
    const attacker = opponent.battleArea.find((p) => p.topCard.cardId === "BT24-017")!;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      const handIds = human.hand.map((card) => card.instanceId);
      const securityIds = human.security.map((card) => card.instanceId);
      expect(observe(s.engine).hasKeyword(attacker, "Progress")).toBe(true);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "attackEnded") && !s.state.pendingDecision);
      expect(attacker.isSuspended).toBe(true);
      expect(opponent.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true);
      expect(s.state.memory).toBe(3);
      expect(s.state.turnSeat).toBe(1);
      expect(human.hand.map((card) => card.instanceId)).toEqual(mode === "pay" ? handIds.slice(2) : handIds);
      expect(human.security.map((card) => card.instanceId)).toEqual(
        mode === "pay" ? securityIds : securityIds.slice(1),
      );
      expect(human.trash.map((card) => card.instanceId)).toEqual(
        mode === "pay" ? handIds.slice(0, 2) : [securityIds[0]],
      );
      expect(s.events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "BT13-088")).toHaveLength(
        mode === "pay" ? 1 : 0,
      );
      expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(mode === "pay" ? 0 : 1);
      if (mode === "one-card") expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT13-088")).toHaveLength(0);

      if (mode === "pay") {
        const paymentIndex = s.events.findIndex(
          (e) => e.kind === "cardsMoved" && e.to === "trash" && e.instanceIds.includes(handIds[0]!),
        );
        const resolvedIndex = s.events.findIndex((e) => e.kind === "effectResolved" && e.sourceCardId === "BT13-088");
        const endedIndex = s.events.findIndex((e) => e.kind === "attackEnded");
        expect(paymentIndex).toBeGreaterThan(-1);
        expect(resolvedIndex).toBeGreaterThan(paymentIndex);
        expect(endedIndex).toBeGreaterThan(resolvedIndex);
        const second = opponent.battleArea.find((p) => p.topCard.cardId === "BT1-009")!;
        // Two unspent cards prove OPT exclusion rather than an empty hand suppressing its cost.
        const secondHandIds = human.hand.map((card) => card.instanceId);
        const decisionsBefore = s.decisions.length;
        expect(
          s.engine.applyIntent(1, {
            type: "attack",
            attackerPermanentId: second.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.events.filter((e) => e.kind === "attackEnded").length === 2 && !s.state.pendingDecision);
        expect(human.hand.map((card) => card.instanceId)).toEqual(secondHandIds);
        expect(human.security).toHaveLength(4);
        expect(s.decisions.slice(decisionsBefore).filter(({ req }) => req.sourceCardId === "BT13-088")).toHaveLength(0);
      }
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.turnSeat).toBe(0);
      expect(s.state.memory).toBe(3);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
