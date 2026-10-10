import { Decoder, Encoder } from "@colyseus/schema";
import { GameState, Phase, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import "../../cards/index.js";
import type { GameEngine } from "../GameEngine.js";
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

  // Follow-up: both seats saw Monodramon on the field. Its reveal while it sits in the deck
  // must not reach either client as a patch for a ref the client already dropped.
  it("patches both seats through the reveal in the deck without a missing ref", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-feedback24-kaguyamon-empty-deck", s.state, [BLUE_DECK, RED_DECK]);
    const clients = seatClients(s.engine, s.state);
    const loop = s.engine.startTurnLoop();
    await settle(() => clients.patch() && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const bot = s.state.players[1]!;
    clients.patch();
    expect(clients.stateFor(1).players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(
      MONODRAMON,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-feedback24-kaguyamon",
        target: { kind: "permanent", permanentId: "dev-perm-1-feedback24-princemamemon" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        clients.patch() &&
        bot.battleArea.length === 0 &&
        s.events.some((event) => event.kind === "attackEnded") &&
        s.state.pendingDecision === undefined,
    );
    clients.patch();

    expect(s.events.some((event) => event.kind === "cardRevealed" && event.cardId === "BT1-009")).toBe(true);
    expect(clients.decoderErrors).toEqual([]);
    for (const seat of [0, 1] as const) {
      const seen = clients.stateFor(seat).players[1]!;
      expect(seen.deckCount).toBe(0);
      expect(seen.battleArea).toHaveLength(0);
      expect(Array.from(seen.trash, (card) => card.instanceId)).toEqual(
        Array.from(bot.trash, (card) => card.instanceId),
      );
    }

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    s.engine.expireMatchTimer(0);
    await loop;
    clients.restore();
  });
});

/** The room's client fan-out: one StateView and decoder per seat, patched as `AegisRoom.broadcastPatch` does. */
function seatClients(engine: GameEngine, state: GameState) {
  const encoder = new Encoder(state);
  const seats = ([0, 1] as Seat[]).map((seat) => ({
    seat,
    view: engine.makeStateView(seat)!,
    decoder: new Decoder(new GameState()),
  }));
  engine.installVisibility((ownerSeat, zone, card) => {
    for (const target of seats) engine.exposeCardToView(target.view, target.seat, ownerSeat, zone, card);
  });
  const decoderErrors: string[] = [];
  const consoleError = vi.spyOn(console, "error").mockImplementation((message: unknown) => {
    decoderErrors.push(String(message));
  });
  const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  let full = true;
  const patch = (): true => {
    engine.syncCounts();
    for (const target of seats) engine.refreshStateView(target.view, target.seat);
    const iterator = { offset: 0 };
    if (full) encoder.encodeAll(iterator);
    else encoder.encode(iterator);
    const shared = iterator.offset;
    for (const target of seats) {
      iterator.offset = shared;
      target.decoder.decode(
        full ? encoder.encodeAllView(target.view, shared, iterator) : encoder.encodeView(target.view, shared, iterator),
      );
    }
    encoder.discardChanges();
    for (const target of seats) engine.forgetWithheldCards(target.view, target.seat);
    full = false;
    return true;
  };
  return {
    patch,
    decoderErrors,
    stateFor: (seat: Seat) => seats[seat]!.decoder.state as GameState,
    restore: () => {
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    },
  };
}
