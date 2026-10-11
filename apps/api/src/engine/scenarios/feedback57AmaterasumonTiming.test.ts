/* oxlint-disable vitest/no-conditional-expect -- Fixed table modes select independent printed-rule outcomes. */
import { expect, it } from "vitest";
import { Phase, type Permanent } from "@aegis/shared";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

it.each(["empty", "pay", "decline"] as const)(
  "Feedback #57: Amaterasumon's %s resolution finishes before the second security check",
  async (mode) => {
    const paid = mode === "pay";
    let target: Permanent | undefined;
    let targetDPAtSecondCheck: number | undefined;
    const s = setupEngine({
      onEvent: (event) => {
        if (event.kind === "securityRevealed" && event.revealedCardId === "EX12-035")
          targetDPAtSecondCheck = target?.currentDP;
      },
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferOptionIndex: 1,
      preferInstanceIds: ["feedback57-return-red", "feedback57-return-blue", "dev-perm-1-feedback57-target"],
      declinePrompts: [
        "Ascension",
        "Amaterasumon",
        "Return 1 to hand",
        "Play without paying",
        ...(mode === "decline" ? ["returning 2"] : []),
      ],
    });
    layDevScenario(
      mode === "empty"
        ? "arena-feedback57-amaterasumon-empty-resolution"
        : "arena-feedback57-amaterasumon-paid-resolution",
      s.state,
      [RED_DECK, BLUE_DECK],
    );
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const attacker = human.battleArea[0]!;
    target = opponent.battleArea.find((p) => p.permanentId === "dev-perm-1-feedback57-target");
    const sourceIds = [attacker.topCard.instanceId, ...attacker.stack.map((c) => c.instanceId)];
    const originalOpponentDeck = opponent.deck.map((c) => c.instanceId);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const deckBefore = human.deck.length;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.events.some((e) => e.kind === "attackEnded") && !s.state.pendingDecision && s.state.turnSeat === 1,
      );
      const evolved = s.events.find((e) => e.kind === "digivolved" && e.cardId === "EX12-047");
      expect(evolved).toMatchObject({ permanentId: attacker.permanentId, mechanic: "normal" });
      expect(human.deck).toHaveLength(deckBefore - 1);
      const resolved = s.events.findIndex(
        (e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-047" && e.timing === "WhenDigivolving",
      );
      const firstChecked = s.events.findIndex((e) => e.kind === "securityChecked" && e.revealedCardId === "LM-058");
      const secondReveal = s.events.findIndex((e) => e.kind === "securityRevealed" && e.revealedCardId === "EX12-035");
      expect(resolved).toBeGreaterThan(-1);
      expect(firstChecked).toBeGreaterThan(resolved);
      expect(secondReveal).toBeGreaterThan(firstChecked);
      expect(
        s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "EX12-047" && e.timing === "OnPlay"),
      ).toBe(false);
      expect(opponent.security.map((c) => c.instanceId)).toEqual(["feedback57-last-security"]);
      expect(opponent.battleArea.some((p) => p.topCard.instanceId === "feedback57-parkour")).toBe(true);
      expect(opponent.trash.map((c) => c.instanceId)).not.toContain("feedback57-parkour");
      expect(opponent.breeding?.topCard.cardId).toBe("EX5-015");
      const secondBattle = s.events.find((e) => e.kind === "securityChecked" && e.revealedCardId === "EX12-035");
      expect(secondBattle).toMatchObject({
        battle: { attackerDP: paid ? 18000 : 12000, securityCardDP: 12000, attackerDeleted: !paid },
      });
      if (paid) {
        const returned = s.events.findIndex(
          (e) =>
            e.kind === "cardsMoved" &&
            e.to === "deckBottom" &&
            ["feedback57-return-red", "feedback57-return-blue"].every((id) => e.instanceIds.includes(id)),
        );
        expect(returned).toBeGreaterThan(-1);
        expect(returned).toBeLessThan(resolved);
        expect(attacker.topCard.instanceId).toBe("feedback57-amaterasu");
        expect(attacker.stack.map((c) => c.instanceId)).toEqual([sourceIds[1], sourceIds[0]]);
        expect(attacker.isSuspended).toBe(true);
        expect(human.trash).toHaveLength(0);
        expect(opponent.deck.map((c) => c.instanceId)).toEqual([
          ...originalOpponentDeck.slice(3),
          "feedback57-parkour-bottom",
          "feedback57-return-red",
          "feedback57-return-blue",
        ]);
      } else {
        expect(human.battleArea).toHaveLength(0);
        expect(human.trash.map((c) => c.instanceId)).toEqual(
          expect.arrayContaining([...sourceIds, "feedback57-amaterasu"]),
        );
      }
      if (mode !== "empty") {
        expect(targetDPAtSecondCheck).toBe(paid ? 10000 : 20000);
        const deletion = s.events.findIndex(
          (e) => e.kind === "cardsMoved" && e.to === "trash" && e.instanceIds.includes("dev-field-1-feedback57-lowest"),
        );
        expect(deletion).toBeGreaterThan(-1);
        expect(deletion).toBeLessThan(resolved);
        expect(opponent.trash.map((c) => c.instanceId)).toContain("dev-field-1-feedback57-lowest");
        expect(opponent.battleArea.some((p) => p.permanentId === "dev-perm-1-feedback57-lowest")).toBe(false);
        expect(opponent.battleArea.find((p) => p.permanentId === "dev-perm-1-feedback57-target")!.currentDP).toBe(
          20000,
        );
        expect(opponent.trash.some((c) => c.instanceId === "feedback57-return-red")).toBe(!paid);
        expect(opponent.trash.some((c) => c.instanceId === "feedback57-return-blue")).toBe(!paid);
      } else {
        expect(
          s.decisions.filter(({ req }) => req.sourceCardId === "EX12-047" && req.options?.timing === "WhenDigivolving"),
        ).toHaveLength(0);
        expect(
          s.decisions.filter(({ req }) => req.sourceCardId === "EX12-047" && req.promptText?.includes("returning 2")),
        ).toHaveLength(0);
      }
      expect(s.state.memory).toBe(1);
      expect(s.state.phase).toBe(Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      assertNoLoudGap(s);
    } finally {
      if (s.state.phase === Phase.Breeding && !s.state.gameOver) {
        s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
        await advance(s.engine).waitForMainPhase(s.state.turnSeat);
      }
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
