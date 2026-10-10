import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CombatWindow,
  EFFECT_UNIT_MS,
  EVENT_CHANNEL,
  PendingDecision,
  Phase,
  eventAnimationMs,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import type { Client } from "colyseus";
import type { GameEngine } from "../engine/GameEngine.js";
import { AegisRoom } from "./AegisRoom.js";

const rooms: AegisRoom[] = [];
afterEach(() => {
  for (const room of rooms.splice(0)) room.onDispose();
  vi.restoreAllMocks();
});

function room(
  options: Parameters<AegisRoom["onCreate"]>[0] = {
    private: true,
    matchTimer: true,
    timerStartSeconds: 60,
    timerRefillSeconds: 0,
  },
) {
  const result = new AegisRoom();
  result.lock = vi.fn(async () => {});
  result.unlock = vi.fn(async () => {});
  result.setMatchmaking = vi.fn(async (updates) => {
    if (updates.maxClients !== undefined) result.maxClients = updates.maxClients;
  });
  result.lock = vi.fn(async () => undefined) as AegisRoom["lock"];
  result.broadcast = vi.fn() as AegisRoom["broadcast"];
  result.onCreate({ seed: 1, ...options });
  rooms.push(result);
  return result;
}
function engine(room: AegisRoom): GameEngine {
  return (room as unknown as { engine: GameEngine }).engine;
}
function sync(room: AegisRoom) {
  (room as unknown as { syncMatchClock(): void }).syncMatchClock();
}
function begin(room: AegisRoom, seat: Seat) {
  (room as unknown as { matchStartRequested: boolean }).matchStartRequested = true;
  room.state.turnCount = 1;
  room.state.phase = Phase.Main;
  room.state.turnSeat = seat;
  void engine(room).mainPhase.run(seat);
}

describe("room clock enforcement", () => {
  it("expires through the authoritative outcome pipeline and unwinds the Main wait", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room();
    begin(game, 0);
    sync(game);
    now.mockReturnValue(60_000);
    sync(game);
    expect(game.state.gameOver).toBe(true);
    expect(game.state.winnerSeat).toBe(1);
    expect(engine(game).mainPhase.isOpen).toBe(false);
    expect(game.broadcast).toHaveBeenCalledWith(
      EVENT_CHANNEL,
      expect.objectContaining({ kind: "gameOver", reason: "timeout", result: { outcome: "win", winnerSeat: 1 } }),
    );
  });

  it("closes the actual opening mulligan and refuses late answers after expiry", async () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room();
    (game as unknown as { matchStartRequested: boolean }).matchStartRequested = true;
    const waiting = engine(game).mulligan.request(0);
    sync(game);
    now.mockReturnValue(60_000);
    sync(game);
    await waiting;
    expect(engine(game).mulligan.isOpen).toBe(false);
    expect(game.state.pendingDecision).toBeUndefined();
    expect(engine(game).applyIntent(0, { type: "mulligan", keep: false }).ok).toBe(false);
  });

  it("disables the timer when a legacy casual room successfully seats a bot", () => {
    const game = room({ matchTimer: true });
    const client = { sessionId: "human", send: vi.fn() } as never;
    game.clients.push(client);
    game.onJoin(client, { displayName: "Human", deck: { mainDeck: [], eggDeck: [] } });
    expect(game.addBot()).toBe(true);
    expect(game.state.matchTimer).toBe(false);
    expect(game.state.timerActiveSeat).toBe(-1);
  });

  it("charges a defending decision and not the turn player", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room();
    begin(game, 0);
    const decision = new PendingDecision();
    decision.seat = 1;
    game.state.pendingDecision = decision;
    sync(game);
    now.mockReturnValue(10_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(60);
    expect(game.state.timerRemaining1).toBe(50);
    game.state.pendingDecision = undefined;
    const window = new CombatWindow();
    window.seat = 1;
    game.state.combatWindow = window;
    now.mockReturnValue(15_000);
    sync(game);
    expect(game.state.timerActiveSeat).toBe(1);
    expect(game.state.timerRemaining1).toBe(45);
  });

  it("pauses while the engine resolves and resumes the existing bank", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room();
    begin(game, 0);
    sync(game);
    now.mockReturnValue(5000);
    sync(game);
    engine(game).mainVerbContinuationsInFlight = 1;
    sync(game);
    now.mockReturnValue(20_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(55);
    engine(game).mainVerbContinuationsInFlight = 0;
    sync(game);
    now.mockReturnValue(25_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(50);
  });

  it("publishes the 60s/30s turn bonuses once while retaining each player's reserve", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room({ private: true, matchTimer: true, timerStartSeconds: 300, timerRefillSeconds: 0 });
    begin(game, 0);
    sync(game);
    now.mockReturnValue(100_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(200);
    const decision = new PendingDecision();
    decision.seat = 1;
    game.state.pendingDecision = decision;
    sync(game);
    now.mockReturnValue(150_000);
    sync(game);
    expect(game.state.timerRemaining1).toBe(250);

    game.state.turnCount = 2;
    game.state.turnSeat = 1;
    sync(game);
    expect(game.state.timerRemaining1).toBe(300);
    expect(game.state.timerRemaining0).toBe(230);
    now.mockReturnValue(170_000);
    sync(game);
    expect(game.state.timerRemaining1).toBe(280);

    game.state.pendingDecision = undefined;
    sync(game);
    now.mockReturnValue(220_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(180);
    game.state.turnCount = 3;
    game.state.turnSeat = 0;
    sync(game);
    expect(game.state.timerRemaining0).toBe(240);
    expect(game.state.timerRemaining1).toBe(300);
    now.mockReturnValue(230_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(230);
  });

  function presentingRoom() {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room();
    begin(game, 0);
    const internals = game as unknown as {
      seatByClient: Map<string, Seat>;
      stamp(event: ServerEvent): void;
      closeBatch(): void;
      handleAnimationSpeed(client: Client, payload: unknown): void;
    };
    internals.seatByClient.set("seat-0", 0);
    internals.seatByClient.set("seat-1", 1);
    const seats = [{ sessionId: "seat-0" } as Client, { sessionId: "seat-1" } as Client] as const;
    const effectBatch = () => {
      internals.stamp({ kind: "effectTriggered" } as ServerEvent);
      internals.closeBatch();
    };
    sync(game);
    return { now, game, internals, seats, effectBatch };
  }

  it("holds a Slow deciding seat until both back-to-back batches have played at Slow", () => {
    const { now, game, internals, seats, effectBatch } = presentingRoom();
    internals.handleAnimationSpeed(seats[0], { speed: "slow" });
    effectBatch();
    effectBatch();
    const slowEffectMs = Math.round(EFFECT_UNIT_MS * 1.4);
    now.mockReturnValue(2 * slowEffectMs - 100);
    sync(game);
    expect(game.state.timerActiveSeat).toBe(-1);
    expect(game.state.timerRemaining0).toBe(60);
    now.mockReturnValue(2 * slowEffectMs + 3000);
    sync(game);
    expect(game.state.timerActiveSeat).toBe(0);
    expect(game.state.timerRemaining0).toBe(57);
  });

  it("starts a Fast seat's clock earlier than a Slow seat's for the same batches", () => {
    const { now, game, internals, seats, effectBatch } = presentingRoom();
    internals.handleAnimationSpeed(seats[0], { speed: "fast" });
    internals.handleAnimationSpeed(seats[1], { speed: "slow" });
    effectBatch();
    effectBatch();
    const fastEnd = 2 * eventAnimationMs({ kind: "effectTriggered" }, 0, "fast");
    const slowEnd = 2 * eventAnimationMs({ kind: "effectTriggered" }, 1, "slow");
    expect(fastEnd).toBeLessThan(slowEnd);
    now.mockReturnValue(fastEnd + 1000);
    sync(game);
    expect(game.state.timerActiveSeat).toBe(0);
    expect(game.state.timerRemaining0).toBe(59);

    game.state.pendingDecision = new PendingDecision();
    game.state.pendingDecision.seat = 1;
    sync(game);
    now.mockReturnValue(slowEnd - 100);
    sync(game);
    expect(game.state.timerActiveSeat).toBe(-1);
    expect(game.state.timerRemaining1).toBe(60);
    now.mockReturnValue(slowEnd + 2000);
    sync(game);
    expect(game.state.timerRemaining1).toBe(58);
  });

  it("defaults to Normal and ignores speeds from spectators and malformed reports", () => {
    const { now, game, internals, effectBatch } = presentingRoom();
    const spectator = { sessionId: "spectator" } as Client;
    internals.handleAnimationSpeed(spectator, { speed: "slow" });
    internals.handleAnimationSpeed({ sessionId: "seat-0" } as Client, { speed: "turbo" });
    internals.handleAnimationSpeed({ sessionId: "seat-0" } as Client, null);
    effectBatch();
    now.mockReturnValue(EFFECT_UNIT_MS + 1000);
    sync(game);
    expect(game.state.timerActiveSeat).toBe(0);
    expect(game.state.timerRemaining0).toBe(59);
  });

  it("never runs before both seats are ready", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room();
    sync(game);
    now.mockReturnValue(300_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(60);
    expect(game.state.gameOver).toBe(false);
  });

  it.each(["arena-match-timer", "arena-chronomon-engage-order"] as const)(
    "enables %s with the standard timer policy",
    (devScenario) => {
      const game = room({ botRoom: true, devScenario });
      expect(game.state.matchTimer).toBe(true);
      expect(game.state.timerStartSeconds).toBe(300);
      expect(game.state.timerRefillSeconds).toBe(60);
      expect(room({ botRoom: true, devScenario: "arena", matchTimer: true }).state.matchTimer).toBe(false);
    },
  );

  it("disables crafted ranked, tournament and bot clock options", () => {
    for (const mode of [{ rankedRoom: true }, { tournamentRoom: true }, { botRoom: true }]) {
      expect(room({ ...mode, matchTimer: true }).state.matchTimer).toBe(false);
    }
  });

  it("ignores non-host overrides and legacy refill settings", () => {
    const game = room();
    expect(game.state.timerStartSeconds).toBe(60);
    expect(game.state.timerRefillSeconds).toBe(60);
    expect(room({ matchTimer: true, timerStartSeconds: 60, timerRefillSeconds: 0 }).state.timerStartSeconds).toBe(300);
  });
});
