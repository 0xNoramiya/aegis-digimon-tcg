import fixtureMervamonTrashDigixros from "./mervamon-trash-digixros.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("— Mervamon trash DigiXros", () => {
  it.each(["mervamon", "ignitemon"])("plays with %s from trash through the real turn loop", async (material) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
    layScenarioFixture(s.state, fixtureMervamonTrashDigixros, [BLUE_DECK, RED_DECK], true);
    const human = s.state.players[0]!;
    const materialId = fixtureVariant(
      {
        played: fixtureInstanceId("trash-xros-played-card"),
        draw: fixtureInstanceId("trash-xros-draw-card"),
        mervamon: fixtureInstanceId("trash-xros-mervamon-card"),
        ignitemon: fixtureInstanceId("trash-xros-ignitemon-card"),
        invalid: fixtureInstanceId("trash-xros-invalid-card"),
      },
      material,
    );
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      for (const materialInstanceIds of [
        [fixtureInstanceId("trash-xros-mervamon-card"), fixtureInstanceId("trash-xros-ignitemon-card")],
        [fixtureInstanceId("trash-xros-invalid-card")],
      ]) {
        expect(
          s.engine.applyIntent(0, {
            type: "playCard",
            instanceId: fixtureInstanceId("trash-xros-played-card"),
            digiXros: { materialInstanceIds },
          }),
        ).toMatchObject({ ok: false });
      }
      expect(human.trash).toHaveLength(3);
      expect(s.state.memory).toBe(10);
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: fixtureInstanceId("trash-xros-played-card"),
          digiXros: { materialInstanceIds: [materialId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => human.battleArea.length === 1 && s.state.pendingDecision === undefined);
      expect(human.battleArea[0]!.topCard.cardId).toBe("BT11-086");
      expect(human.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual([materialId]);
      expect(human.trash).toHaveLength(2);
      expect(s.state.memory).toBe(2);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
