import fixtureKotoneDigixrosAnyTamerEffect from "./kotone-digixros-any-tamer-effect.fixture.js";
import fixtureTaikiDigixrosAnyTamerHand from "./taiki-digixros-any-tamer-hand.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("— DigiXros materials under any Tamer", () => {
  it.each([false, true])("runs the arena reproduction (effect play=%s)", async (effectPlay) => {
    const automation = {
      autoSelectCards: true,
      autoAcceptOptional: false,
      autoDeclineOptional: true,
      preferInstanceIds: [fixtureInstanceId("any-tamer-played-card")],
    };
    const s = setupEngine({ 0: {}, 1: {} }, automation);
    layScenarioFixture(
      s.state,
      effectPlay ? fixtureKotoneDigixrosAnyTamerEffect : fixtureTaikiDigixrosAnyTamerHand,
      [BLUE_DECK, RED_DECK],
      true,
    );
    const human = s.state.players[0]!;
    const taiki = human.battleArea.find((p) => p.topCard.cardId === "BT10-087")!;
    const kotone = human.battleArea.find((p) => p.topCard.cardId === "P-224")!;
    const materials = [...taiki.stack, ...kotone.stack]
      .filter((c) => c.instanceId !== fixtureInstanceId("any-tamer-played-card"))
      .map((c) => c.instanceId);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      await settle();
      automation.autoAcceptOptional = true;
      automation.autoDeclineOptional = false;
      const result = effectPlay
        ? s.engine.applyIntent(0, {
            type: "activateEffect",
            sourceInstanceId: kotone.topCard.instanceId,
            effectKey: observe(s.engine).activatableEffects(kotone)[0]!.effectKey,
          })
        : s.engine.applyIntent(0, {
            type: "playCard",
            instanceId: fixtureInstanceId("any-tamer-played-card"),
            digiXros: { materialInstanceIds: materials, expanderPermanentIds: [taiki.permanentId] },
          });
      expect(result).toEqual({ ok: true });
      await settle(
        () =>
          human.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("any-tamer-played-card")) &&
          s.state.pendingDecision === undefined,
      );
      const played = human.battleArea.find((p) => p.topCard.instanceId === fixtureInstanceId("any-tamer-played-card"))!;
      expect(played.stack.map((c) => c.instanceId).sort()).toEqual(materials.sort());
      expect(taiki.isSuspended).toBe(true);
      expect(kotone.isSuspended).toBe(effectPlay);
      expect(taiki.stack).toHaveLength(0);
      expect(kotone.stack).toHaveLength(0);
      expect(s.state.memory).toBe(effectPlay ? 4 : 7);
      expect(s.decisions.some(({ req }) => req.options?.effectText?.includes("Select 1 Tamer"))).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
