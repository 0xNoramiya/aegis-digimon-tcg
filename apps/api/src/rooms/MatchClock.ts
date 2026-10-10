import {
  type GameState,
  type Seat,
  matchTimerSettings,
  type MatchTimerOptions,
  MATCH_TIMER_OPPONENT_REFILL_SECONDS,
} from "@aegis/shared";
import { PRESENTATION_BACKLOG_MAX_MS } from "./presentationBudget.js";

/**
 * Server monotonic-time accounting.
 *
 * Each seat has its own presentation pause: the seat is not charged while its client still
 * plays the batches that came before its question. The server sets the pause's length from
 * the batches themselves (presentationBudget.ts). A client report can only shorten it.
 */
export class MatchClock {
  private remaining: [number, number];
  private lastTime: number;
  private runningSeat: Seat | undefined;
  private pausedUntil: [number, number] = [0, 0];
  /** The revision a seat must report having presented to end its pause. */
  private awaitedVersion: [number, number] = [0, 0];
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
      const elapsed = Math.max(0, now - Math.max(this.lastTime, this.pausedUntil[chargedSeat]));
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
    this.state.timerActiveSeat = inputSeat !== undefined && now >= this.pausedUntil[inputSeat] ? inputSeat : -1;
  }

  /**
   * Both seats watch the batch that closed at `stateVersion`, so both get its allowance on
   * top of what they still have to watch. Only the seat asked to act is ever charged.
   */
  pauseForPresentation(now: number, allowanceMs: number, stateVersion: number): void {
    for (const seat of [0, 1] as const) {
      const backlog = Math.max(this.pausedUntil[seat], now) + allowanceMs;
      this.pausedUntil[seat] = Math.min(backlog, now + PRESENTATION_BACKLOG_MAX_MS);
      this.awaitedVersion[seat] = stateVersion;
    }
    this.state.timerActiveSeat = -1;
  }

  /** The seat's client has presented everything up to `stateVersion`; charge it from now. */
  presentationCaughtUp(seat: Seat, stateVersion: number, now: number): void {
    if (stateVersion < this.awaitedVersion[seat]) return;
    this.pausedUntil[seat] = Math.min(this.pausedUntil[seat], now);
  }

  private publish(): void {
    this.state.timerRemaining0 = Math.ceil(this.remaining[0] / 1000);
    this.state.timerRemaining1 = Math.ceil(this.remaining[1] / 1000);
  }
}
