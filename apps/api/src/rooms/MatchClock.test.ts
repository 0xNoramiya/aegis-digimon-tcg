import { describe, expect, it } from "vitest";
import { GameState, matchTimerSettings } from "@aegis/shared";
import { MatchClock } from "./MatchClock.js";
import { PRESENTATION_BACKLOG_MAX_MS } from "./presentationBudget.js";

function clock(options = { matchTimer: true, timerStartSeconds: 60, timerRefillSeconds: 15 }) {
  const state = new GameState();
  return { state, timer: new MatchClock(state, options, true, 0) };
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

  it("pauses the deciding seat until its client reports the batch presented", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.pauseForPresentation(0, 8000, 4);
    timer.update(3000, 0);
    expect(state.timerActiveSeat).toBe(-1);
    expect(state.timerRemaining0).toBe(60);
    timer.presentationCaughtUp(0, 4, 3000);
    timer.update(3000, 0);
    expect(state.timerActiveSeat).toBe(0);
    timer.update(5000, 0);
    expect(state.timerRemaining0).toBe(58);
  });

  it("starts charging at the allowance's end when the client never reports", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.pauseForPresentation(0, 8000, 4);
    timer.update(7900, 0);
    expect(state.timerActiveSeat).toBe(-1);
    expect(state.timerRemaining0).toBe(60);
    timer.update(10_000, 0);
    expect(state.timerActiveSeat).toBe(0);
    expect(state.timerRemaining0).toBe(58);
  });

  it("adds each batch's allowance to the backlog, up to a fixed ceiling", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.pauseForPresentation(0, 5000, 4);
    timer.pauseForPresentation(1000, 5000, 5);
    timer.update(9900, 0);
    expect(state.timerRemaining0).toBe(60);
    timer.update(12_000, 0);
    expect(state.timerRemaining0).toBe(58);
    for (let version = 6; version < 20; version += 1) timer.pauseForPresentation(12_000, 20_000, version);
    timer.update(12_000 + PRESENTATION_BACKLOG_MAX_MS + 1000, 0);
    expect(state.timerRemaining0).toBe(57);
  });

  it("ignores a report for an older batch than the latest one", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.pauseForPresentation(0, 5000, 4);
    timer.pauseForPresentation(0, 5000, 5);
    timer.presentationCaughtUp(0, 4, 1000);
    timer.update(9000, 0);
    expect(state.timerActiveSeat).toBe(-1);
    expect(state.timerRemaining0).toBe(60);
    timer.presentationCaughtUp(0, 5, 9000);
    timer.update(10_000, 0);
    expect(state.timerRemaining0).toBe(59);
  });

  it("uses only the deciding seat's report and never charges the other seat", () => {
    const { state, timer } = clock();
    timer.update(0, 1);
    timer.pauseForPresentation(0, 8000, 4);
    timer.presentationCaughtUp(0, 4, 500);
    timer.update(3000, 1);
    expect(state.timerActiveSeat).toBe(-1);
    expect(state.timerRemaining0).toBe(60);
    expect(state.timerRemaining1).toBe(60);
    timer.presentationCaughtUp(1, 4, 3000);
    timer.update(6000, 1);
    expect(state.timerRemaining0).toBe(60);
    expect(state.timerRemaining1).toBe(57);
  });

  it("keeps a disconnected seat's pause until the allowance ends, and a reconnect report ends it", () => {
    const { state, timer } = clock();
    timer.update(0, 0);
    timer.pauseForPresentation(0, 8000, 4);
    // Disconnected: no report arrives, so only the allowance bounds the pause.
    timer.update(4000, 0);
    expect(state.timerRemaining0).toBe(60);
    // The reconnected client replays history as its baseline and reports the newest batch.
    timer.presentationCaughtUp(0, 4, 4000);
    timer.update(6000, 0);
    expect(state.timerRemaining0).toBe(58);
  });

  it.each([0, 15, 30, 60])(
    "adds 60s to the owner and 30s to the opponent once, ignoring legacy refill %i",
    (refill) => {
      const { state, timer } = clock({ matchTimer: true, timerStartSeconds: 300, timerRefillSeconds: refill });
      state.turnCount = 1;
      timer.update(0, 0);
      timer.update(100_000, 1);
      timer.update(150_000, 1);
      expect(state.timerRemaining0).toBe(200);
      expect(state.timerRemaining1).toBe(250);
      state.turnCount = 2;
      state.turnSeat = 1;
      timer.update(150_000, 1);
      expect(state.timerRemaining0).toBe(230);
      expect(state.timerRemaining1).toBe(300);
      timer.update(170_000, 0);
      expect(state.timerRemaining1).toBe(280);
      timer.update(220_000, 0);
      expect(state.timerRemaining0).toBe(180);
      state.turnCount = 3;
      state.turnSeat = 0;
      timer.update(220_000, 0);
      expect(state.timerRemaining0).toBe(240);
      expect(state.timerRemaining1).toBe(300);
      timer.update(220_000, 0);
      expect(state.timerRemaining0).toBe(240);
      timer.update(230_000, 0);
      expect(state.timerRemaining0).toBe(230);
    },
  );

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
    expect(timer.update(60_000, 1)).toBe(0);
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
    expect(matchTimerSettings({ matchTimer: true, timerStartSeconds: 60, timerRefillSeconds: 0 })).toEqual({
      enabled: true,
      startSeconds: 300,
      refillSeconds: 60,
    });
    expect(matchTimerSettings({ matchTimer: true, timerStartSeconds: -1, timerRefillSeconds: Infinity }, true)).toEqual(
      { enabled: true, startSeconds: 300, refillSeconds: 60 },
    );
    expect(matchTimerSettings({ matchTimer: "true" } as never, true).enabled).toBe(false);
  });
});
