import { ANIMATION_TIMINGS as T } from "./animationTimings.js";
import type { ServerEvent } from "./events.js";
import type { Seat } from "../schema/enums.js";
import {
  CARD_ARRIVAL_NARRATION_MS,
  PHASE_NARRATION_MS,
  SECURITY_CHECK_NARRATION_MS,
  TURN_NARRATION_MS,
} from "./pacing.js";

/* How long a player's screen spends on each event, and so how long the server holds that
   player's match clock while the batch plays. The client sends nothing back: the server
   computes the pause from this table and the speed the player chose. */

export type EffectSpeed = "slow" | "normal" | "fast";

export const EFFECT_SPEEDS: readonly EffectSpeed[] = ["slow", "normal", "fast"];

export const DEFAULT_EFFECT_SPEED: EffectSpeed = "normal";

/** What each Effect speed multiplies the client's effect beats by. */
export const EFFECT_SPEED_SCALE: Record<EffectSpeed, number> = { slow: 1.4, normal: 1, fast: 0.55 };

/**
 * Extra time the opponent's played or digivolved card stays centre-screen. The showcase
 * itself keeps the reference client's 560 ms beat, which players who read the board
 * fast prefer; Slow is for the ones who could not tell what the opponent just did.
 */
export const OPPONENT_SHOWCASE_EXTRA_HOLD_MS: Record<EffectSpeed, number> = { slow: 2000, normal: 0, fast: 0 };

/**
 * How much each effect still to play stretches the client's board, prompt and stall budgets,
 * at Normal speed: one effect's source glow, clause and results.
 */
export const EFFECT_UNIT_MS = 2500;

export function isEffectSpeed(value: unknown): value is EffectSpeed {
  return EFFECT_SPEEDS.some((speed) => speed === value);
}

/** Client -> server: the seat's Effect speed. Sent on join and whenever the player changes it. */
export const ANIMATION_SPEED_CHANNEL = "animationSpeed" as const;

export interface AnimationSpeedReport {
  speed: EffectSpeed;
}

/** Events whose length follows the Effect speed (the client scales its effect beats). */
const SPEED_SCALED_EVENTS: ReadonlySet<ServerEvent["kind"]> = new Set(["effectTriggered", "effectActivated"]);

const SHOWCASE_EVENTS: ReadonlySet<ServerEvent["kind"]> = new Set(["cardPlayed", "digivolved"]);

/** Events the client draws nothing for, or only a short beat. */
const DEFAULT_EVENT_MS = 150;

const CLASH_TOTAL_MS = T.clashAttackerEnter + T.clashReveal + T.clashHold + T.clashOutcome + T.clashExit;

/** Normal-speed length of what the client draws for each event. */
export const EVENT_ANIMATION_MS: Partial<Record<ServerEvent["kind"], number>> = {
  /** The opening security deal, both hands' draws and the first turn banner. */
  matchStarted: 3000,
  phaseChanged: PHASE_NARRATION_MS,
  turnEnded: TURN_NARRATION_MS,
  /** The call-out, the target arrow, and the defender's shield arming and breaking. */
  attackDeclared: T.attackAnnounce + T.attackArrow + T.securityArm + T.shieldBreak + T.securityBreakHold,
  /** The reveal and the clash. A security effect's own beats are counted by its effect events. */
  securityRevealed: SECURITY_CHECK_NARRATION_MS,
  securityChecked: T.securityClauseRead,
  /** The clash and the DP pulse it ends on. */
  battleCompared: CLASH_TOTAL_MS + T.dpPulse + T.dpPulseFatalHold,
  effectTriggered: EFFECT_UNIT_MS,
  effectActivated: EFFECT_UNIT_MS,
  cardRevealed: T.revealShowcaseIn + T.revealShowcaseHold + T.revealShowcaseOut,
  cardPlayed: CARD_ARRIVAL_NARRATION_MS,
  digivolved: CARD_ARRIVAL_NARRATION_MS,
  cardsMoved: T.removalStagger + T.cardShatter + T.deletionBurst,
  hatched: T.cardEnter + T.cardSparkle,
  movedFromBreeding: T.cardEnter + T.cardSparkle,
  deckShuffled: T.deckRiffle * 4,
  blocked: T.attackArrow + T.cardShake + T.cardShakeHold,
  deletionPrevented: T.cardShake + T.cardShakeHold + T.dpPulse,
  dpModifierApplied: T.dpPulse + T.dpPulseFatalHold,
  memoryChanged: T.memoryArc + T.memoryMarkerPop,
};

/** How long `viewer`'s screen spends on `event` at `speed`. */
export function eventAnimationMs(
  event: Pick<ServerEvent, "kind"> & { seat?: Seat },
  viewer: Seat,
  speed: EffectSpeed,
): number {
  const base = EVENT_ANIMATION_MS[event.kind] ?? DEFAULT_EVENT_MS;
  const scaled = SPEED_SCALED_EVENTS.has(event.kind) ? Math.round(base * EFFECT_SPEED_SCALE[speed]) : base;
  const opponentShowcase = SHOWCASE_EVENTS.has(event.kind) && event.seat !== undefined && event.seat !== viewer;
  return scaled + (opponentShowcase ? OPPONENT_SHOWCASE_EXTRA_HOLD_MS[speed] : 0);
}
