import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("a two-color digivolution cost accepts either printed color", () => {
  it("prints Wisemon's yellow/black Lv.4 digivolution cost as 4", () => {
    expect(getCardDefinition("EX13-034")?.evoCosts).toEqual([
      { color: "Yellow", level: 4, memoryCost: 4 },
      { color: "Black", level: 4, memoryCost: 4 },
    ]);
  });

  it("lets a black level 4 Digimon digivolve into Wisemon for 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-056", as: "blackBase" }],
        hand: [{ card: "EX13-034", as: "wisemon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackBase").permanentId,
        instanceId: s.inst("wisemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blackBase").topCard?.cardId === "EX13-034");

    expect(s.state.memory).toBe(0);
  });
});
