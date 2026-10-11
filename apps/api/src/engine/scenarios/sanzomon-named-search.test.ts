import fixtureEx6SanzomonNamedSearch from "./ex6-sanzomon-named-search.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

it("arena: one DigiXros material and one of each named reveal", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layScenarioFixture(s.state, fixtureEx6SanzomonNamedSearch, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const play = (materialInstanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("sanzo-hand-0-card"),
        digiXros: { materialInstanceIds },
      });
    expect(play([fixtureInstanceId("sanzo-hand-1-card"), fixtureInstanceId("sanzo-hand-2-card")]).ok).toBe(false);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(play([fixtureInstanceId("sanzo-hand-1-card")])).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 1 &&
        !s.state.pendingDecision &&
        s.engine.mainVerbContinuationsInFlight === 0,
    );
    expect(s.state.memory).toBe(5);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual([
      fixtureInstanceId("sanzo-hand-1-card"),
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [
        fixtureInstanceId("sanzo-hand-2-card"),
        fixtureInstanceId("sanzo-hand-3-card"),
        fixtureInstanceId("sanzo-deck-0-card"),
        fixtureInstanceId("sanzo-deck-1-card"),
        fixtureInstanceId("sanzo-deck-3-card"),
      ].sort(),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      fixtureInstanceId("sanzo-deck-5-card"),
      fixtureInstanceId("sanzo-deck-2-card"),
      fixtureInstanceId("sanzo-deck-4-card"),
    ]);
    const revealed = s.events.filter((event) => event.kind === "cardRevealed" && event.sourceCardId === "EX6-025");
    expect(revealed).toHaveLength(4);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});
