import fixtureLanamonTamerCost from "./lanamon-tamer-cost.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("playable Lanamon scenario charges Rina 2, blue rookie 2, Calmaramon 0", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
  layScenarioFixture(s.state, fixtureLanamonTamerCost, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const player = s.state.players[0]!;
    const red = player.battleArea.find((perm) => perm.topCard.cardId === "BT12-088")!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: red.permanentId,
        instanceId: fixtureInstanceId("lanamon-0-card"),
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    for (const [index, [cardId, remaining]] of [
      ["BT11-112", 8],
      ["BT12-021", 6],
      ["BT12-025", 6],
    ].entries()) {
      const base = player.battleArea.find((perm) => perm.topCard.cardId === cardId)!;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: base.permanentId,
          instanceId: fixtureVariant(
            {
              "0": fixtureInstanceId("lanamon-0-card"),
              "1": fixtureInstanceId("lanamon-1-card"),
              "2": fixtureInstanceId("lanamon-2-card"),
            },
            index,
          ),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
      expect(base.topCard.cardId).toBe("BT12-024");
      expect(base.stack.map((card) => card.cardId)).toEqual([cardId]);
      expect(s.state.memory).toBe(remaining);
      expect(s.state.phase).toBe(Phase.Main);
    }
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
