import {
  type GameState,
  type Seat,
  matchTimerSettings,
  type MatchTimerOptions,
  MATCH_TIMER_OPPONENT_REFILL_SECONDS,
} from "@aegis/shared";

/**
 * The furthest ahead a seat's presentation timeline may run. Honest play never comes near
 * it: it takes a minute of animation queued faster than it plays. It stops a client that
 * fires actions far faster than anyone can watch them from banking unlimited free time.
 */
export const PRESENTATION_BACKLOG_MAX_MS = 60_000;

/**
 * Server monotonic-time accounting.
 *
 * Each seat has its own presentation timeline, `presentEnd`: when that seat's screen
 * finishes the batches sent so far, at the seat's own Effect speed. A seat asked to act is
 * charged from `max(now, presentEnd[seat])`, so it never pays for animations still playing.
 * The server computes the timeline from the shared animation table; the client reports
 * nothing but its speed.
 */
export class MatchClock {
  private remaining: [number, number];
  private lastTime: number;
  private runningSeat: Seat | undefined;
  private presentEnd: [number, number] = [0, 0];
  private lastTurn = 0;

  constructor(
    private readonly state: GameState,
    options: Partial<MatchTimerOptions>,
    privateRoom: boolean,
    now: number,
  ) {
    const settings = matchTimerSettings(options, privateRoom);
    state.matchTimer = settings.enabled;
    state.timerStartSeconds = settings.startSeconds;
    state.timerRefillSeconds = settings.refillSeconds;
    this.remaining = [settings.startSeconds * 1000, settings.startSeconds * 1000];
    this.lastTime = now;
    this.publish();
  }

  /** Charge the previous owner before changing turns/owners or accepting a late answer. */
  update(now: number, inputSeat: Seat | undefined): Seat | undefined {
    if (!this.state.matchTimer || this.state.gameOver) {
      this.runningSeat = undefined;
      this.state.timerActiveSeat = -1;
      this.lastTime = now;
      return;
    }
    const chargedSeat = this.runningSeat;
    if (chargedSeat !== undefined) {
      const elapsed = Math.max(0, now - Math.max(this.lastTime, this.presentEnd[chargedSeat]));
      this.remaining[chargedSeat] = Math.max(0, this.remaining[chargedSeat] - elapsed);
    }
    this.lastTime = now;
    // Expiry wins over a turn bonus or an answer arriving at the deadline.
    if (chargedSeat !== undefined && this.remaining[chargedSeat] === 0) {
      this.runningSeat = undefined;
      this.publish();
      this.state.timerActiveSeat = -1;
      return chargedSeat;
    }
    if (this.state.turnCount > this.lastTurn) {
      // The opening turn uses the initial reserve; later turns grant both seats their bonuses.
      if (this.lastTurn > 0) {
        const owner = this.state.turnSeat;
        const opponent = (1 - owner) as Seat;
        const cap = this.state.timerStartSeconds * 1000;
        this.remaining[owner] = Math.min(cap, this.remaining[owner] + this.state.timerRefillSeconds * 1000);
        this.remaining[opponent] = Math.min(cap, this.remaining[opponent] + MATCH_TIMER_OPPONENT_REFILL_SECONDS * 1000);
      }
      this.lastTurn = this.state.turnCount;
    }
    this.runningSeat = inputSeat;
    this.publish();
    this.state.timerActiveSeat = inputSeat !== undefined && now >= this.presentEnd[inputSeat] ? inputSeat : -1;
  }

  /** Each seat's screen plays the batch that just closed, after what it still has queued. */
  presentBatch(now: number, durationMs: readonly [number, number]): void {
    for (const seat of [0, 1] as const) {
      const end = Math.max(this.presentEnd[seat], now) + durationMs[seat];
      this.presentEnd[seat] = Math.min(end, now + PRESENTATION_BACKLOG_MAX_MS);
    }
    this.state.timerActiveSeat = -1;
  }

  /** A reconnecting client catches up without replaying, so its screen is current now. */
  resetPresentation(seat: Seat, now: number): void {
    this.presentEnd[seat] = Math.min(this.presentEnd[seat], now);
  }

  private publish(): void {
    this.state.timerRemaining0 = Math.ceil(this.remaining[0] / 1000);
    this.state.timerRemaining1 = Math.ceil(this.remaining[1] / 1000);
  }
}
