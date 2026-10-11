import { describe, expect, it } from "vitest";
import { validReplayEvent } from "@/replays/eventValidation";

describe("replay digivolution outcome validation", () => {
  it.each([
    { outcome: undefined, accepted: true },
    { outcome: false, accepted: true },
    { outcome: true, accepted: true },
    { outcome: "false", accepted: false },
    { outcome: null, accepted: false },
  ])("accepts outcome $outcome: $accepted", ({ outcome, accepted }) => {
    expect(
      validReplayEvent({
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "LM-057",
        effectKey: "delay",
        description: "Digivolve with the cost reduced by 2.",
        digivolutionPerformed: outcome,
        seq: 1,
        batch: "effect",
        stateVersion: 1,
      }),
    ).toBe(accepted);
  });
});
