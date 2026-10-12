import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/digixros-materials-are-not-effect-placement.fixture";

describe("DigiXros materials are not placed by an effect", () => {
  it("does not activate Hiro Amanokawa when a Hero Digimon is played by DigiXros", async () => {
    const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    const loop = s.engine.runOneTurn();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.memory).toBe(4);

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("omniShoutmon").instanceId,
          digiXros: { materialInstanceIds: [s.inst("shoutmon").instanceId] },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT21-021") &&
          s.state.pendingDecision === undefined,
      );

      const omniShoutmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT21-021")!;
      const hiro = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT21-080")!;
      expect(omniShoutmon.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("shoutmon").instanceId]);
      expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT21-080")).toHaveLength(0);
      expect(hiro.isSuspended).toBe(false);
      expect(s.state.memory).toBe(-2);
      expect(s.state.players[0]!.hand).toHaveLength(1);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
