export const MATCH_TIMER_START_SECONDS = 720;
export const MATCH_TIMER_SERIES_START_SECONDS = 900;
export const MATCH_TIMER_REFILL_SECONDS = 60;
export const MATCH_TIMER_START_OPTIONS = [300, 600, 720, 900, 1200] as const;
export const MATCH_TIMER_DECISION_SECONDS = 30;
export const MATCH_TIMER_ACTION_SECONDS = 60;
export const MATCH_TIMER_ROPE_SECONDS = 15;
export const MATCH_TIMER_STRIKE_LIMIT = 3;
export const MULLIGAN_TIMER_SECONDS = 30;
export interface MatchTimerOptions {
  matchTimer: boolean;
  timerStartSeconds?: number;
  timerRefillSeconds?: number;
}
export function matchTimerSettings(options: Partial<MatchTimerOptions>, privateRoom = false, bestOf = 1) {
  const chosen = options.timerStartSeconds;
  const allowed = (MATCH_TIMER_START_OPTIONS as readonly number[]).includes(chosen as number);
  return {
    enabled: options.matchTimer === true,
    startSeconds:
      privateRoom && allowed ? chosen! : bestOf > 1 ? MATCH_TIMER_SERIES_START_SECONDS : MATCH_TIMER_START_SECONDS,
    refillSeconds: MATCH_TIMER_REFILL_SECONDS,
  };
}
