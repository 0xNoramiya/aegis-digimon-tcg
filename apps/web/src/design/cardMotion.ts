import { ANIMATION_TIMINGS } from "@aegis/shared";

/** A quarter-turn with flat endpoint tangents: 3t² − 2t³. */
export const CARD_SUSPEND_MOTION = {
  durationMs: ANIMATION_TIMINGS.suspendRotate,
  easing: "cubic-bezier(0.3333333333, 0, 0.6666666667, 1)",
} as const;
