import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const KEYWORDS = ["Rush", "Alliance", "Scapegoat"];
const MOTHER_ID = "dev-perm-0-feedback9-mother";

describe("Feedback #9 playable Akemi Suedou scenario", () => {
  it("grants Rush, Alliance and Scapegoat to the battle-area Mother Eater it is placed under", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
    layDevScenario("arena-feedback9-akemi-inherited-mother-eater", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const akemi = human.battleArea.find((permanent) => permanent.topCard.cardId === "BT22-095")!;
    const akemiId = akemi.topCard.instanceId;
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const view = observe(s.engine);
      expect(KEYWORDS.map((keyword) => view.hasKeyword(MOTHER_ID, keyword))).toEqual([false, false, false]);
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: MOTHER_ID, target: { kind: "player" } }),
      ).toMatchObject({ ok: false });

      const effect = view.activatableEffects(akemi)[0]!;
      expect(
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: akemiId, effectKey: effect.effectKey }),
      ).toEqual({ ok: true });
      const mother = human.battleArea.find((permanent) => permanent.permanentId === MOTHER_ID)!;
      await settle(
        () => mother.stack.some((card) => card.instanceId === akemiId) && s.state.pendingDecision === undefined,
      );

      expect(KEYWORDS.map((keyword) => view.hasKeyword(MOTHER_ID, keyword))).toEqual([true, true, true]);
      expect([...mother.keywords]).toEqual(expect.arrayContaining(KEYWORDS));
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: MOTHER_ID, target: { kind: "player" } }),
      ).toEqual({ ok: true });
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
