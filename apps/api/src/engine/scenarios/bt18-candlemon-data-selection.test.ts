import fixtureBt18CandlemonDataSelection from "./bt18-candlemon-data-selection.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const DYNASMON = fixtureInstanceId("candlemon-dynasmon-card");
const WIZARDMON = fixtureInstanceId("candlemon-wizardmon-card");
const CANDLEMON = fixtureInstanceId("candlemon-revealed-card");

describe("BT18 Candlemon arena", () => {
  it.each(["dynasmon", "wizardmon"] as const)("replays Nom's reveal with %s as the yellow Data pick", async (pick) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoOrderCards: false });
    layScenarioFixture(s.state, fixtureBt18CandlemonDataSelection, [RED_DECK, BLUE_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const player = s.state.players[0]!;
      const deckBefore = player.deck.map(({ instanceId }) => instanceId);
      const memoryBefore = s.state.memory;
      expect(deckBefore.slice(0, 3)).toEqual([DYNASMON, CANDLEMON, WIZARDMON]);
      expect(
        s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("candlemon-play-card") }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision !== undefined);
      const selection = s.decisions.at(-1)!.req;
      expect(selection.kind).toBe("selectCards");
      expect(selection.options?.candidateInstanceIds).toEqual([DYNASMON, CANDLEMON, WIZARDMON]);
      expect(selection.options?.effectTextPart).toBe("Add 1 yellow card with the [Data] trait");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: selection.decisionId,
          response: { kind: "selectCards", instanceIds: [pick === "dynasmon" ? DYNASMON : WIZARDMON] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== selection.decisionId);
      const next = s.decisions.at(-1)!.req;
      expect(next.kind).toBe(pick === "dynasmon" ? "selectCards" : "orderCards");
      expect(next.options?.candidateInstanceIds).toEqual(pick === "dynasmon" ? [WIZARDMON] : [DYNASMON, CANDLEMON]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: next.decisionId,
          response:
            pick === "dynasmon"
              ? { kind: "selectCards", instanceIds: [WIZARDMON] }
              : { kind: "orderCards", order: [CANDLEMON, DYNASMON] },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.state.pendingDecision === undefined && player.hand.some(({ instanceId }) => instanceId === WIZARDMON),
      );
      expect(player.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
        (pick === "dynasmon"
          ? [fixtureInstanceId("candlemon-draw-card"), DYNASMON, WIZARDMON]
          : [fixtureInstanceId("candlemon-draw-card"), WIZARDMON]
        ).sort(),
      );
      expect(player.deck.map(({ instanceId }) => instanceId)).toEqual([
        ...deckBefore.slice(3),
        CANDLEMON,
        ...(pick === "wizardmon" ? [DYNASMON] : []),
      ]);
      expect(player.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
        fixtureInstanceId("candlemon-play-card"),
      );
      expect(s.state.memory).toBe(memoryBefore - 3);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
