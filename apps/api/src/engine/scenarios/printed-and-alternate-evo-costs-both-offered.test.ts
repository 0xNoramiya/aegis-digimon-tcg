import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("a Digimon that meets both the printed and the [Digivolve] requirement offers both costs", () => {
  it("prints Karakurumon's purple/green Lv.4 digivolution cost as 4", () => {
    expect(getCardDefinition("EX12-063")?.evoCosts).toEqual([
      { color: "Purple", level: 4, memoryCost: 4 },
      { color: "Green", level: 4, memoryCost: 4 },
    ]);
  });

  it.each([
    { useAlternateCost: false, paid: 4 },
    { useAlternateCost: true, paid: 3 },
  ])(
    "lets Kokeshimon digivolve into Karakurumon for $paid (alternate=$useAlternateCost)",
    async ({ useAlternateCost, paid }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX12-062", as: "kokeshimon" }],
            hand: [{ card: "EX12-063", as: "karakurumon" }],
            deck: ["BT1-009", "BT1-009"],
          },
          1: { deck: ["BT1-009", "BT1-009"] },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 2;
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      const memoryBefore = s.state.memory;
      const karakurumon = s.state.players[0]!.hand.find(
        (card) => card.instanceId === s.inst("karakurumon").instanceId,
      )!;
      const routes = karakurumon.digivolveRoutes.filter(
        (route) => route.permanentId === s.perm("kokeshimon").permanentId,
      );
      expect(routes.map((route) => route.projectedCost).sort()).toEqual([3, 4]);

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("kokeshimon").permanentId,
          instanceId: s.inst("karakurumon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("kokeshimon").topCard?.cardId === "EX12-063" && s.state.pendingDecision === undefined);

      expect(memoryBefore - s.state.memory).toBe(paid);
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
    },
  );
});
