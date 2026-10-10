import type { ServerEvent } from "@aegis/shared";

/*
 * The longest a client may take to present one closed batch before the match clock charges
 * the deciding seat anyway. A client that reports it has caught up ends the pause sooner;
 * this bound only matters for a client that never reports, or reports late.
 *
 *   batch allowance = min(BATCH_MAX_MS, BATCH_MARGIN_MS + SLOWEST_SPEED_SCALE * sum(event beats))
 *   seat pause      = min(BACKLOG_MAX_MS, what is left of the seat's pause + batch allowance)
 *
 * The beats are the Normal-speed lengths of what the web client draws for each event
 * (apps/web/src/game/timings.ts and pacing.ts), rounded up. They are scaled by the Slow
 * Effect speed (EFFECT_SPEED_SCALE.slow), the longest a player can choose, and Slow's extra
 * hold on an opponent's played card is added on top. Events the client draws nothing
 * for, or only a short beat, take the default.
 */
const SLOWEST_SPEED_SCALE = 1.4;
const SLOW_SHOWCASE_EXTRA_HOLD_MS = 2000;
const BATCH_MARGIN_MS = 1000;
const BATCH_MAX_MS = 20_000;
export const PRESENTATION_BACKLOG_MAX_MS = 30_000;
const DEFAULT_EVENT_BEAT_MS = 150;

const EVENT_BEAT_MS: Partial<Record<ServerEvent["kind"], number>> = {
  matchStarted: 3000,
  phaseChanged: 1200,
  turnEnded: 1200,
  attackDeclared: 1600,
  securityRevealed: 3000,
  securityChecked: 1500,
  battleCompared: 2000,
  // An effect's source glow, clause and results: one effect unit (pacing.ts `unitBudgetMs`).
  effectTriggered: 2500,
  effectActivated: 2500,
  cardRevealed: 1500,
  cardsMoved: 800,
  hatched: 1000,
  movedFromBreeding: 1000,
  deckShuffled: 800,
  blocked: 1000,
  deletionPrevented: 800,
  dpModifierApplied: 1200,
  memoryChanged: 600,
};

const SHOWCASE_EVENTS: ReadonlySet<ServerEvent["kind"]> = new Set(["cardPlayed", "digivolved"]);
const SHOWCASE_BEAT_MS = 1500;

export function eventPresentationMs(kind: ServerEvent["kind"]): number {
  if (SHOWCASE_EVENTS.has(kind)) return SHOWCASE_BEAT_MS * SLOWEST_SPEED_SCALE + SLOW_SHOWCASE_EXTRA_HOLD_MS;
  return (EVENT_BEAT_MS[kind] ?? DEFAULT_EVENT_BEAT_MS) * SLOWEST_SPEED_SCALE;
}

/** `eventMs` is the sum of {@link eventPresentationMs} over the batch's events. */
export function batchPresentationMs(eventMs: number): number {
  return Math.min(BATCH_MAX_MS, BATCH_MARGIN_MS + eventMs);
}
