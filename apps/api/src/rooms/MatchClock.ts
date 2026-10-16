import {
  type GameState,
  type Seat,
  matchTimerSettings,
  type MatchTimerOptions,
  MULLIGAN_TIMER_SECONDS,
} from "@aegis/shared";

export const PRESENTATION_BACKLOG_MAX_MS = 60_000;

export type ClockMode = "match" | "mulligan" | "frozen";

export interface ClockExpiry {
  seat: Seat;
  clock: "match" | "mulligan" | "window";
}

export interface ClockWindow {
  key: string;
  seconds: number;
}

export interface MatchClockSetup {
  privateRoom: boolean;
  bestOf: number;
  carriedSeconds?: readonly [number, number];
}

interface OpenWindow extends ClockWindow {
  seat: Seat;
  remainingMs: number;
}

export class MatchClock {
  private remaining: [number, number];
  private mulliganRemaining: [number, number] = [MULLIGAN_TIMER_SECONDS * 1000, MULLIGAN_TIMER_SECONDS * 1000];
  private lastTime: number;
  private running: { seat: Seat; mode: ClockMode } | undefined;
  private window: OpenWindow | undefined;
  private presentEnd: [number, number] = [0, 0];

  constructor(
    private state: GameState,
    options: Partial<MatchTimerOptions>,
    setup: MatchClockSetup,
    now: number,
  ) {
    const settings = matchTimerSettings(options, setup.privateRoom, setup.bestOf);
    state.matchTimer = settings.enabled;
    state.timerStartSeconds = settings.startSeconds;
    state.timerRefillSeconds = settings.refillSeconds;
    const start = settings.startSeconds * 1000;
    const carried = setup.carriedSeconds;
    this.remaining = carried
      ? [Math.min(start, carried[0] * 1000), Math.min(start, carried[1] * 1000)]
      : [start, start];
    this.lastTime = now;
    this.publish();
  }

  rebindAfterRollback(state: GameState, previous: GameState, now: number): void {
    state.matchTimer = previous.matchTimer;
    state.timerStartSeconds = previous.timerStartSeconds;
    state.timerRefillSeconds = previous.timerRefillSeconds;
    this.state = state;
    this.presentEnd = [0, 0];
    this.running = undefined;
    this.window = undefined;
    this.lastTime = now;
    this.publish();
  }

  update(
    now: number,
    inputSeat: Seat | undefined,
    mode: ClockMode = "match",
    window?: ClockWindow,
  ): ClockExpiry | undefined {
    if (!this.state.matchTimer || this.state.gameOver) {
      this.running = undefined;
      this.state.timerActiveSeat = -1;
      this.lastTime = now;
      if (this.window) {
        this.window = undefined;
        this.publish();
      }
      return;
    }
    const charged = this.running;
    if (charged !== undefined && charged.mode !== "frozen") {
      const bank = this.bank(charged.mode);
      const elapsed = Math.max(0, now - Math.max(this.lastTime, this.presentEnd[charged.seat]));
      bank[charged.seat] = Math.max(0, bank[charged.seat] - elapsed);
      const openWindow = charged.mode === "match" && this.window?.seat === charged.seat ? this.window : undefined;
      if (openWindow) openWindow.remainingMs = Math.max(0, openWindow.remainingMs - elapsed);
      this.lastTime = now;
      if (bank[charged.seat] === 0) return this.expire({ seat: charged.seat, clock: charged.mode });
      if (openWindow?.remainingMs === 0) return this.expire({ seat: charged.seat, clock: "window" });
    }
    this.lastTime = now;
    this.running = inputSeat === undefined ? undefined : { seat: inputSeat, mode };
    this.openWindow(inputSeat, mode, window);
    this.publish();
    this.state.timerActiveSeat =
      inputSeat !== undefined && mode !== "frozen" && now >= this.presentEnd[inputSeat] ? inputSeat : -1;
  }

  remainingSeconds(): [number, number] {
    return [Math.ceil(this.remaining[0] / 1000), Math.ceil(this.remaining[1] / 1000)];
  }

  presentBatch(now: number, durationMs: readonly [number, number]): void {
    for (const seat of [0, 1] as const) {
      const end = Math.max(this.presentEnd[seat], now) + durationMs[seat];
      this.presentEnd[seat] = Math.min(end, now + PRESENTATION_BACKLOG_MAX_MS);
    }
    this.state.timerActiveSeat = -1;
  }

  resetPresentation(seat: Seat, now: number): void {
    this.presentEnd[seat] = Math.min(this.presentEnd[seat], now);
  }

  private openWindow(inputSeat: Seat | undefined, mode: ClockMode, window: ClockWindow | undefined): void {
    if (inputSeat === undefined || mode !== "match" || window === undefined) {
      if (mode !== "frozen") this.window = undefined;
      return;
    }
    if (this.window?.seat === inputSeat && this.window.key === window.key) return;
    this.window = { ...window, seat: inputSeat, remainingMs: window.seconds * 1000 };
  }

  private expire(expiry: ClockExpiry): ClockExpiry {
    this.running = undefined;
    this.window = undefined;
    this.publish();
    this.state.timerActiveSeat = -1;
    return expiry;
  }

  private bank(mode: Exclude<ClockMode, "frozen">): [number, number] {
    return mode === "mulligan" ? this.mulliganRemaining : this.remaining;
  }

  private publish(): void {
    this.state.timerRemaining0 = Math.ceil(this.remaining[0] / 1000);
    this.state.timerRemaining1 = Math.ceil(this.remaining[1] / 1000);
    this.state.mulliganTimerRemaining0 = Math.ceil(this.mulliganRemaining[0] / 1000);
    this.state.mulliganTimerRemaining1 = Math.ceil(this.mulliganRemaining[1] / 1000);
    this.state.timerWindowSeat = this.window?.seat ?? -1;
    this.state.timerWindowSeconds = this.window?.seconds ?? 0;
    this.state.timerWindowRemaining = this.window ? Math.ceil(this.window.remainingMs / 1000) : 0;
  }
}
