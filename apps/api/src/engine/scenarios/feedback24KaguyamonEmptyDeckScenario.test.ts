import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const MONODRAMON = "dev-field-1-feedback24-monodramon";

// Feedback #24: Kaguyamon's return reaches an empty deck. The owner's pending PrinceMamemon
// [On Deletion] reveal then finds that card and trashes it, as printed.
describe("Feedback #24 playable Kaguyamon empty-deck scenario", () => {
  it("returns Monodramon to the empty deck, then PrinceMamemon's reveal trashes it", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-feedback24-kaguyamon-empty-deck", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const bot = s.state.players[1]!;
    expect(bot.deck).toHaveLength(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-feedback24-kaguyamon",
        target: { kind: "permanent", permanentId: "dev-perm-1-feedback24-princemamemon" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        bot.battleArea.length === 0 &&
        s.events.some((event) => event.kind === "attackEnded") &&
        s.state.pendingDecision === undefined,
    );

    const movedToDeckBottom = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "deckBottom" && event.instanceIds.includes(MONODRAMON),
    );
    const revealed = s.events.findIndex(
      (event) => event.kind === "cardRevealed" && event.seat === 1 && event.cardId === "BT1-009",
    );
    const trashed = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "trash" && event.instanceIds.includes(MONODRAMON),
    );
    expect(movedToDeckBottom).toBeGreaterThanOrEqual(0);
    expect(revealed).toBeGreaterThan(movedToDeckBottom);
    expect(trashed).toBeGreaterThan(revealed);
    expect(bot.deck).toHaveLength(0);
    expect(bot.trash.map((card) => card.cardId).sort()).toEqual(["BT1-009", "EX13-063"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX12-065");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    s.engine.expireMatchTimer(0);
    await loop;
  });
});
