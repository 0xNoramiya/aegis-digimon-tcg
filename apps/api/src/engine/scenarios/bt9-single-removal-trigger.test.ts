import fixtureBt26029SingleRemovalTrigger from "./bt26-029-single-removal-trigger.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const HOLY = fixtureInstanceId("bt26-029-holy-card");

describe("follow-up: BT26-029 single security-removal trigger scenario", () => {
  it("offers Holy's removal effect once in the order prompt and resolves it once", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureBt26029SingleRemovalTrigger, [BLUE_DECK, RED_DECK], true);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: HOLY })).toEqual({ ok: true });
      await settle(() => opponent.battleArea.length === 0 && s.state.pendingDecision === undefined);

      const offered = s.decisions
        .filter(({ req }) => req.kind === "orderTriggers")
        .map(({ req }) => [...(req.options?.triggerCardIds ?? [])].sort());
      expect(offered).toEqual([["BT15-084", "BT26-029"]]);
      expect(
        s.events
          .flatMap((event) =>
            event.kind === "effectResolved" && (event.sourceCardId === "BT26-029" || event.sourceCardId === "BT15-084")
              ? [`${event.sourceCardId}/${event.timing}`]
              : [],
          )
          .sort(),
      ).toEqual(["BT15-084/whenEffectRemovesFromSecurity", "BT26-029/OnPlay", "BT26-029/whenSecurityRemoved"]);
      expect(human.security).toHaveLength(3);
      expect(opponent.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(3);
      expect(s.state.memory).toBe(2);
    } finally {
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      s.engine.expireMatchTimer(s.state.turnSeat);
      await loop;
    }
  });
});
