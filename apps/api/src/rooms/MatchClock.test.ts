import { describe, expect, it } from "vitest";
import {
  GameState,
  MULLIGAN_TIMER_SECONDS,
  MATCH_TIMER_SERIES_START_SECONDS,
  MATCH_TIMER_START_SECONDS,
  matchTimerSettings,
} from "@aegis/shared";
import { MatchClock, PRESENTATION_BACKLOG_MAX_MS } from "./MatchClock.js";

function clock(bankSeconds = 60) {
  const state = new GameState();
  const options = { matchTimer: true, timerStartSeconds: 1200 };
  const setup = { privateRoom: true, bestOf: 1, carriedSeconds: [bankSeconds, bankSeconds] as const };
  return { state, timer: new MatchClock(state, options, setup, 0) };
}

describe("optional match clock", () => {
  it("keeps waiting rooms and disabled clocks untouched", () => {
    const { state, timer } = clock();
    timer.update(90_000, undefined);
    expect(state.timerRemaining0).toBe(60);
    state.matchTimer = false;
    timer.update(90_000, 0);
    expect(timer.update(200_000, 0)).toBeUndefined();
    expect(state.timerActiveSeat).toBe(-1);
  });

  it("charges only the player asked to act, including the defending player's response", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.update(10_000, 1);
    timer.update(15_000, 0);
    expect(state.timerRemaining0).toBe(50);
    expect(state.timerRemaining1).toBe(55);
    expect(state.timerActiveSeat).toBe(0);
  });

  it("pauses during resolution and resumes without charging the paused interval", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.update(10_000, undefined);
    timer.update(100_000, 1);
    timer.update(101_000, 1);
    expect(state.timerRemaining0).toBe(50);
    expect(state.timerRemaining1).toBe(59);
  });

  it("holds the deciding seat for exactly the batch's computed animation time, with no client report", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.presentBatch(0, [8000, 8000]);
    timer.update(7900, 0);
    expect(state.timerActiveSeat).toBe(-1);
    expect(state.timerRemaining0).toBe(60);
    timer.update(8000, 0);
    expect(state.timerActiveSeat).toBe(0);
    timer.update(10_000, 0);
    expect(state.timerRemaining0).toBe(58);
  });

  it("queues back-to-back batches on the seat's timeline", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.presentBatch(0, [5000, 5000]);
    timer.presentBatch(1000, [5000, 5000]);
    timer.update(9900, 0);
    expect(state.timerRemaining0).toBe(60);
    timer.update(12_000, 0);
    expect(state.timerRemaining0).toBe(58);
  });

  it("starts each seat's clock at the end of its own timeline", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.presentBatch(0, [3000, 6000]);
    timer.update(4000, 0);
    expect(state.timerRemaining0).toBe(59);
    timer.update(4000, 1);
    timer.update(5000, 1);
    expect(state.timerRemaining1).toBe(60);
    timer.update(9000, 1);
    expect(state.timerRemaining1).toBe(57);
  });

  it("caps a timeline queued far faster than it plays", () => {
    const { state, timer } = clock(300);
    timer.update(0, 0);
    for (let batch = 0; batch < 20; batch += 1) timer.presentBatch(0, [20_000, 20_000]);
    timer.update(PRESENTATION_BACKLOG_MAX_MS + 1000, 0);
    expect(state.timerRemaining0).toBe(299);
  });

  it("never charges the seat that is not asked to act", () => {
    const { state, timer } = clock();
    timer.update(0, 1);
    timer.presentBatch(0, [1000, 1000]);
    timer.update(6000, 1);
    expect(state.timerRemaining0).toBe(60);
    expect(state.timerRemaining1).toBe(55);
  });

  it("ends a reconnecting seat's timeline at the reconnect", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.presentBatch(0, [8000, 8000]);
    timer.update(2000, 0);
    timer.resetPresentation(0, 2000);
    timer.update(4000, 0);
    expect(state.timerRemaining0).toBe(58);
  });

  it("carries the remaining bank across turns without refilling it", () => {
    const { state, timer } = clock(300);
    state.turnCount = 1;
    timer.update(0, 0);
    timer.update(100_000, 1);
    timer.update(150_000, 1);
    state.turnCount = 2;
    state.turnSeat = 1;
    timer.update(150_000, 1);
    expect(state.timerRemaining0).toBe(200);
    expect(state.timerRemaining1).toBe(250);
  });

  it("preserves the opening reserve without granting a bonus after mulligan", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.update(10_000, undefined);
    expect(state.timerRemaining0).toBe(50);
    state.turnCount = 1;
    state.turnSeat = 0;
    timer.update(10_000, 0);
    expect(state.timerRemaining0).toBe(50);
  });

  it("expires before an answer or turn bonus arriving at the deadline", () => {
    const { state, timer } = clock();
    state.turnCount = 1;
    timer.update(0, 0);
    state.turnCount = 2;
    expect(timer.update(60_000, 1)).toEqual({ seat: 0, clock: "match" });
    expect(state.timerRemaining0).toBe(0);
    expect(state.timerActiveSeat).toBe(-1);
  });

  it("stops charging when the match is over", () => {
    const { state, timer } = clock();
    timer.update(0, 1);
    timer.update(10_000, 1);
    state.gameOver = true;
    expect(timer.update(80_000, 1)).toBeUndefined();
    expect(state.timerRemaining1).toBe(50);
    expect(state.timerActiveSeat).toBe(-1);
  });

  it("ignores public overrides and rejects malformed private timing options", () => {
    expect(matchTimerSettings({ matchTimer: true, timerStartSeconds: 300, timerRefillSeconds: 0 })).toEqual({
      enabled: true,
      startSeconds: MATCH_TIMER_START_SECONDS,
      refillSeconds: 60,
    });
    expect(matchTimerSettings({ matchTimer: true, timerStartSeconds: -1, timerRefillSeconds: Infinity }, true)).toEqual(
      { enabled: true, startSeconds: MATCH_TIMER_START_SECONDS, refillSeconds: 60 },
    );
    expect(matchTimerSettings({ matchTimer: true, timerStartSeconds: 600 }, true).startSeconds).toBe(600);
    expect(matchTimerSettings({ matchTimer: "true" } as never, true).enabled).toBe(false);
  });

  it("gives a best-of-three one bank for the whole series", () => {
    expect(matchTimerSettings({ matchTimer: true }, false, 3).startSeconds).toBe(MATCH_TIMER_SERIES_START_SECONDS);
    const state = new GameState();
    new MatchClock(state, { matchTimer: true }, { privateRoom: false, bestOf: 3, carriedSeconds: [400, 5000] }, 0);
    expect(state.timerStartSeconds).toBe(MATCH_TIMER_SERIES_START_SECONDS);
    expect(state.timerRemaining0).toBe(400);
    expect(state.timerRemaining1).toBe(MATCH_TIMER_SERIES_START_SECONDS);
  });
});

describe("mulligan window and disconnect freeze", () => {
  it("charges the mulligan window, not the match clock, and reports its own expiry", () => {
    const { state, timer } = clock();
    timer.update(0, 0, "mulligan");
    timer.update(10_000, 0, "mulligan");
    expect(state.mulliganTimerRemaining0).toBe(MULLIGAN_TIMER_SECONDS - 10);
    expect(state.timerRemaining0).toBe(60);
    expect(state.timerActiveSeat).toBe(0);
    expect(timer.update(MULLIGAN_TIMER_SECONDS * 1000, 1, "mulligan")).toEqual({ seat: 0, clock: "mulligan" });
    expect(state.timerRemaining0).toBe(60);
    timer.update(30_000, 1, "mulligan");
    timer.update(35_000, 1, "mulligan");
    expect(state.mulliganTimerRemaining1).toBe(MULLIGAN_TIMER_SECONDS - 5);
  });

  it("freezes the deciding seat while its opponent is away and resumes without charging the gap", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.update(5000, 0, "frozen");
    expect(state.timerActiveSeat).toBe(-1);
    expect(timer.update(500_000, 0, "frozen")).toBeUndefined();
    expect(state.timerRemaining0).toBe(55);
    timer.update(505_000, 0);
    expect(state.timerRemaining0).toBe(55);
    timer.update(507_000, 0);
    expect(state.timerRemaining0).toBe(53);
  });
});

describe("decision and action windows", () => {
  const action = { key: "main", seconds: 60 };

  it("expires the window before the bank and publishes its countdown", () => {
    const { state, timer } = clock(600);
    timer.update(0, 0, "match", action);
    expect(state.timerWindowSeat).toBe(0);
    expect(state.timerWindowSeconds).toBe(60);
    timer.update(45_000, 0, "match", action);
    expect(state.timerWindowRemaining).toBe(15);
    expect(timer.update(60_000, 0, "match", action)).toEqual({ seat: 0, clock: "window" });
    expect(state.timerRemaining0).toBe(540);
    expect(state.timerWindowSeat).toBe(-1);
  });

  it("restarts the window after each action and for each new decision", () => {
    const { state, timer } = clock(600);
    timer.update(0, 0, "match", action);
    timer.update(50_000, 0, "match", { key: "after-play", seconds: 60 });
    expect(state.timerWindowRemaining).toBe(60);
    timer.update(55_000, 1, "match", { key: "block", seconds: 30 });
    expect(state.timerWindowSeat).toBe(1);
    expect(state.timerWindowRemaining).toBe(30);
  });

  it("does not run the window during animations or while the opponent is away", () => {
    const { state, timer } = clock(600);
    timer.update(0, 0, "match", action);
    timer.presentBatch(0, [20_000, 20_000]);
    timer.update(20_000, 0, "match", action);
    expect(state.timerWindowRemaining).toBe(60);
    timer.update(30_000, 0, "frozen", action);
    expect(timer.update(500_000, 0, "frozen", action)).toBeUndefined();
    timer.update(500_000, 0, "match", action);
    expect(state.timerWindowRemaining).toBe(50);
  });

  it("lets the bank expire first when it is shorter than the window", () => {
    const { timer } = clock(20);
    timer.update(0, 0, "match", action);
    expect(timer.update(20_000, 0, "match", action)).toEqual({ seat: 0, clock: "match" });
  });

  it("keeps the mulligan outside the window", () => {
    const { state, timer } = clock(600);
    timer.update(0, 0, "mulligan", action);
    expect(state.timerWindowSeat).toBe(-1);
  });
});
