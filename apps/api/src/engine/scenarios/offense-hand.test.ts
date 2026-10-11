import fixtureOffenseHand from "./offense-hand.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it.each([fixtureInstanceId("own-deck-slot-22-card"), fixtureInstanceId("own-deck-slot-20-card")])(
  "live arena Delay consumes chosen own physical card %s",
  async (chosenId) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true });
    layScenarioFixture(s.state, fixtureOffenseHand, [RED_DECK, BLUE_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const host = human.battleArea.find((p) => p.topCard.cardId === "BT1-009")!;
      const delay = human.battleArea.find((p) => p.topCard.cardId === "P-103")!;
      const abilities = JSON.parse(delay.activatableEffectsJson) as { effectKey: string }[];
      expect(abilities).toHaveLength(1);
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: delay.topCard.instanceId,
          effectKey: abilities[0]!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const req = s.decisions.at(-1)!.req;
      expect(req.options?.candidateInstanceIds).toEqual([
        fixtureInstanceId("own-deck-slot-22-card"),
        fixtureInstanceId("own-deck-slot-20-card"),
      ]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "selectCards", instanceIds: [chosenId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => host.topCard.instanceId === chosenId && s.state.pendingDecision === undefined);
      expect(host.topCard.ownerSeat).toBe(0);
      expect(host.controllerSeat).toBe(0);
      expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([
        fixtureInstanceId("opponent-deck-slot-22-card"),
      ]);
      expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT21-019");
      expect(human.trash.some((card) => card.instanceId === delay.topCard.instanceId)).toBe(true);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
