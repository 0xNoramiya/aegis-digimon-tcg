import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { type EngineSetup, settle, setupEngine } from "../testkit/harness.js";

// Feedback #40 follow-up: a printed "By [cost], ... may digivolve" pays its cost even with no
// legal destination (CR 15-7-5), but then must not ask a "Digivolve" yes/no that can do nothing.
function digivolvePrompts(s: EngineSetup, sourceCardId: string): number {
  return s.decisions.filter(
    ({ req }) => req.sourceCardId === sourceCardId && req.kind === "optional" && req.promptText === "Digivolve",
  ).length;
}

describe("Optional By-cost digivolution without a legal destination", () => {
  it.each([
    { label: "a Diaboromon in hand", hand: ["BT17-059"], digivolves: true },
    { label: "no Diaboromon in hand", hand: [], digivolves: false },
  ])(
    "EX6-041 Infermon with $label: pays the deletion, asks Digivolve only when legal",
    async ({ hand, digivolves }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT17-059", as: "payment" }],
            hand: [{ card: "EX6-041", as: "infermon" }, ...hand],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      const infermonId = s.inst("infermon").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: infermonId })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("payment").instanceId) &&
          s.state.pendingDecision === undefined,
      );

      const infermon = s.state.players[0]!.battleArea.find((permanent) =>
        [permanent.topCard, ...permanent.stack].some((card) => card?.instanceId === infermonId),
      );
      expect(infermon?.topCard.cardId).toBe(digivolves ? "BT17-059" : "EX6-041");
      expect(digivolvePrompts(s, "EX6-041")).toBe(digivolves ? 1 : 0);
    },
  );

  it.each([
    { label: "a [Dark Animal] in the trash", trash: [{ card: "BT23-063", as: "destination" }], digivolves: true },
    { label: "an empty trash", trash: [], digivolves: false },
  ])("BT23-088 K with $label: deletes K, asks Digivolve only when legal", async ({ trash, digivolves }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-088", as: "k" },
            { card: "BT2-067", as: "base" },
          ],
          trash,
          deck: Array<string>(5).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const kId = s.inst("k").instanceId;
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === kId) && s.state.pendingDecision === undefined,
    );

    expect(s.perm("base").topCard.cardId).toBe(digivolves ? "BT23-063" : "BT2-067");
    expect(digivolvePrompts(s, "BT23-088")).toBe(digivolves ? 1 : 0);
  });
});
