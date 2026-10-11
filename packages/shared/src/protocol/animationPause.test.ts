import { describe, expect, it } from "vitest";
import {
  EFFECT_SPEED_SCALE,
  EFFECT_UNIT_MS,
  EVENT_ANIMATION_MS,
  OPPONENT_SHOWCASE_EXTRA_HOLD_MS,
  eventAnimationMs,
  isEffectSpeed,
} from "./animationPause.js";
import { ANIMATION_TIMINGS } from "./animationTimings.js";

describe("eventAnimationMs", () => {
  it("scales effect beats by the viewer's Effect speed", () => {
    for (const speed of ["slow", "normal", "fast"] as const)
      expect(eventAnimationMs({ kind: "effectTriggered" }, 0, speed)).toBe(
        Math.round(EFFECT_UNIT_MS * EFFECT_SPEED_SCALE[speed]),
      );
  });

  it("keeps fixed-length scenes at their table length at every speed", () => {
    const length = EVENT_ANIMATION_MS.securityChecked;
    expect(length).toBe(ANIMATION_TIMINGS.securityClauseRead);
    for (const speed of ["slow", "normal", "fast"] as const)
      expect(eventAnimationMs({ kind: "securityChecked" }, 0, speed)).toBe(length);
  });

  it("adds the Slow showcase hold only to the opponent's played card", () => {
    const base = EVENT_ANIMATION_MS.cardPlayed!;
    expect(eventAnimationMs({ kind: "cardPlayed", seat: 0 }, 0, "slow")).toBe(base);
    expect(eventAnimationMs({ kind: "cardPlayed", seat: 1 }, 0, "slow")).toBe(
      base + OPPONENT_SHOWCASE_EXTRA_HOLD_MS.slow,
    );
    expect(eventAnimationMs({ kind: "cardPlayed", seat: 1 }, 0, "normal")).toBe(base);
  });

  it("accepts only known speeds", () => {
    expect(isEffectSpeed("slow")).toBe(true);
    expect(isEffectSpeed("turbo")).toBe(false);
    expect(isEffectSpeed(undefined)).toBe(false);
  });
});
