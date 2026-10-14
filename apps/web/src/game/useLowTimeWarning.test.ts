// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, Seat } from "@aegis/shared";
import { playAttentionSound } from "@/design/sound";
import { useLowTimeWarning } from "@/game/useLowTimeWarning";

vi.mock("@/design/sound", () => ({ playAttentionSound: vi.fn<(kind: string) => void>() }));

type ClockParams = {
  viewerSeconds: number;
  opponentSeconds?: number;
  activeSeat?: number;
  matchTimer?: boolean;
  gameOver?: boolean;
};

function buildClock({
  viewerSeconds,
  opponentSeconds = 300,
  activeSeat = 0,
  matchTimer = true,
  gameOver = false,
}: ClockParams): GameState {
  return {
    matchTimer,
    gameOver,
    timerActiveSeat: activeSeat,
    timerRemaining0: viewerSeconds,
    timerRemaining1: opponentSeconds,
  } as GameState;
}

type RenderParams = { state: GameState; spectating?: boolean; viewerSeat?: Seat };

function renderWarning({ state, spectating = false, viewerSeat = 0 }: RenderParams) {
  return renderHook(
    ({ state: current, spectating: watching }) =>
      useLowTimeWarning({ state: current, viewerSeat, spectating: watching }),
    { initialProps: { state, spectating } },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.mocked(playAttentionSound).mockClear();
  vi.useRealTimers();
});

describe("useLowTimeWarning", () => {
  it("warns once at one minute and once at thirty seconds while the viewer's clock runs down", () => {
    const hook = renderWarning({ state: buildClock({ viewerSeconds: 62 }) });

    hook.rerender({ state: buildClock({ viewerSeconds: 61 }), spectating: false });
    expect(hook.result.current.notice).toBeNull();

    hook.rerender({ state: buildClock({ viewerSeconds: 60 }), spectating: false });
    expect(hook.result.current.notice?.body).toEqual({ variant: "timeWarning", seconds: 60 });

    hook.rerender({ state: buildClock({ viewerSeconds: 59 }), spectating: false });
    hook.rerender({ state: buildClock({ viewerSeconds: 31 }), spectating: false });
    hook.rerender({ state: buildClock({ viewerSeconds: 30 }), spectating: false });
    expect(hook.result.current.notice?.body).toEqual({ variant: "timeWarning", seconds: 30 });

    hook.rerender({ state: buildClock({ viewerSeconds: 29 }), spectating: false });
    expect(playAttentionSound).toHaveBeenCalledTimes(2);
    expect(playAttentionSound).toHaveBeenCalledWith("timerTick");
  });

  it("stays quiet when the viewer's turn starts below a threshold", () => {
    const hook = renderWarning({ state: buildClock({ viewerSeconds: 45, activeSeat: 1 }) });

    hook.rerender({ state: buildClock({ viewerSeconds: 45 }), spectating: false });
    hook.rerender({ state: buildClock({ viewerSeconds: 44 }), spectating: false });

    expect(hook.result.current.notice).toBeNull();
    expect(playAttentionSound).not.toHaveBeenCalled();
  });

  it("stays quiet when the match is first seen below a threshold", () => {
    const hook = renderWarning({ state: buildClock({ viewerSeconds: 58 }) });

    hook.rerender({ state: buildClock({ viewerSeconds: 57 }), spectating: false });

    expect(playAttentionSound).not.toHaveBeenCalled();
  });

  it("ignores the opponent's clock", () => {
    const hook = renderWarning({ state: buildClock({ viewerSeconds: 300, opponentSeconds: 61, activeSeat: 1 }) });

    hook.rerender({ state: buildClock({ viewerSeconds: 300, opponentSeconds: 60, activeSeat: 1 }), spectating: false });
    hook.rerender({ state: buildClock({ viewerSeconds: 300, opponentSeconds: 30, activeSeat: 1 }), spectating: false });

    expect(hook.result.current.notice).toBeNull();
    expect(playAttentionSound).not.toHaveBeenCalled();
  });

  it("never warns a spectator", () => {
    const hook = renderWarning({ state: buildClock({ viewerSeconds: 61 }), spectating: true });

    hook.rerender({ state: buildClock({ viewerSeconds: 60 }), spectating: true });

    expect(hook.result.current.notice).toBeNull();
    expect(playAttentionSound).not.toHaveBeenCalled();
  });

  it("stays quiet in a match without a timer", () => {
    const hook = renderWarning({ state: buildClock({ viewerSeconds: 61, matchTimer: false }) });

    hook.rerender({ state: buildClock({ viewerSeconds: 60, matchTimer: false }), spectating: false });

    expect(playAttentionSound).not.toHaveBeenCalled();
  });

  it("warns again after the bank refills above the threshold", () => {
    const hook = renderWarning({ state: buildClock({ viewerSeconds: 61 }) });
    hook.rerender({ state: buildClock({ viewerSeconds: 60 }), spectating: false });
    hook.rerender({ state: buildClock({ viewerSeconds: 58, activeSeat: 1 }), spectating: false });
    hook.rerender({ state: buildClock({ viewerSeconds: 68, activeSeat: 1 }), spectating: false });
    hook.rerender({ state: buildClock({ viewerSeconds: 68 }), spectating: false });

    hook.rerender({ state: buildClock({ viewerSeconds: 60 }), spectating: false });

    expect(playAttentionSound).toHaveBeenCalledTimes(2);
  });

  it("clears the notice after its reading time and on dismiss", () => {
    const hook = renderWarning({ state: buildClock({ viewerSeconds: 61 }) });
    hook.rerender({ state: buildClock({ viewerSeconds: 60 }), spectating: false });
    expect(hook.result.current.notice).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(hook.result.current.notice).toBeNull();

    hook.rerender({ state: buildClock({ viewerSeconds: 30 }), spectating: false });
    expect(hook.result.current.notice).not.toBeNull();
    act(() => {
      hook.result.current.dismiss();
    });
    expect(hook.result.current.notice).toBeNull();
  });
});
