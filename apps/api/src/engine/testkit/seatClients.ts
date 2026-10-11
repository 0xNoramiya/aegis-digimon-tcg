import { Decoder, Encoder } from "@colyseus/schema";
import { GameState, type Seat } from "@aegis/shared";
import { vi } from "vitest";
import type { GameEngine } from "../GameEngine.js";

/**
 * The room's client fan-out: one StateView and decoder per seat, patched as
 * `AegisRoom.broadcastPatch` does. Install it before the scenario is laid out when the
 * scenario's own cards must reach the views through the visibility port.
 */
export function seatClients(engine: GameEngine, state: GameState) {
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
