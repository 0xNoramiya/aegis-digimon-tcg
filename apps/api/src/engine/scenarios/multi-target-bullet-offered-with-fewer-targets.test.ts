import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("a multi-target modal bullet stays available with fewer targets than printed", () => {
  it("De-Digivolves the two opposing Digimon when BlitzGreymon names three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-021", as: "base" }],
          hand: [{ card: "EX4-051", as: "blitzGreymon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "first", under: [{ card: "BT1-009", as: "firstUnder" }] },
            { card: "BT1-020", as: "second", under: [{ card: "BT1-009", as: "secondUnder" }] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blitzGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "EX4-051" &&
        s.perm("first").stack.length + s.perm("second").stack.length === 0,
    );

    expect(["first", "second"].map((alias) => s.perm(alias).topCard?.cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-020", "BT1-020"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
