import {
  ANIMATION_TIMINGS,
  EFFECT_SPEED_SCALE as SHARED_SPEED_SCALE,
  EFFECT_UNIT_MS,
  OPPONENT_SHOWCASE_EXTRA_HOLD_MS as SHARED_SHOWCASE_EXTRA_HOLD_MS,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { CARD_SUSPEND_MOTION } from "../design/cardMotion";
import { DEFAULT_PACING, EFFECT_SPEED_SCALE, OPPONENT_SHOWCASE_EXTRA_HOLD_MS, PACING_BY_STYLE } from "./pacing";
import { TIMINGS } from "./timings";

/* The server computes timed-match clock pauses from the shared table. These checks fail if
   the client ever animates to a copy of it instead of the table itself. */
describe("client and server read one animation table", () => {
  it("animates to the shared timings, not a copy", () => {
    expect(TIMINGS).toBe(ANIMATION_TIMINGS);
    expect(CARD_SUSPEND_MOTION.durationMs).toBe(ANIMATION_TIMINGS.suspendRotate);
  });

  it("scales by the shared Effect speeds", () => {
    expect(EFFECT_SPEED_SCALE).toBe(SHARED_SPEED_SCALE);
    expect(OPPONENT_SHOWCASE_EXTRA_HOLD_MS).toBe(SHARED_SHOWCASE_EXTRA_HOLD_MS);
  });

  it("budgets one shared effect unit per effect in every pacing style", () => {
    expect(DEFAULT_PACING.unitBudgetMs).toBe(EFFECT_UNIT_MS);
    for (const config of Object.values(PACING_BY_STYLE)) expect(config.unitBudgetMs).toBe(EFFECT_UNIT_MS);
  });
});
