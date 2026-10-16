import { type Permanent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getDigivolveCostOptions } from "./digivolveModel";

function base(cardId: string): Permanent {
  return {
    permanentId: "base",
    controllerSeat: 0,
    topCard: { cardId, instanceId: "top" },
    stack: [],
    inBreeding: false,
  } as unknown as Permanent;
}

describe("base play cost digivolve routes", () => {
  it("hides LM-066's play cost 11 route on a play cost 8 Vortex Warriors base", () => {
    expect(getDigivolveCostOptions("LM-066", base("EX11-032"))).toEqual([
      expect.objectContaining({ type: "normal", cost: 4 }),
    ]);
  });

  it("offers LM-066's play cost 11 route on a play cost 11 Vortex Warriors base", () => {
    expect(getDigivolveCostOptions("LM-066", base("EX11-035"))).toEqual([
      expect.objectContaining({ type: "alternate", cost: 2, alternateRequirementIndex: 0 }),
    ]);
  });
});
