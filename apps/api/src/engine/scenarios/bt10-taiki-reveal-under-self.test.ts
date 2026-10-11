import fixtureBt10TaikiRevealUnderSelf from "./bt10-taiki-reveal-under-self.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("arena places ShootingStarmon only under the newly played Taiki", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoSelectCards: true,
      preferInstanceIds: [fixtureInstanceId("taiki-reveal-deck-3-card"), fixtureInstanceId("taiki-reveal-deck-4-card")],
    },
  );
  layScenarioFixture(s.state, fixtureBt10TaikiRevealUnderSelf, [BLUE_DECK, RED_DECK], true);
  const olderTamers = [...s.state.players[0]!.battleArea];
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("taiki-reveal-played-card") }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT10-087") &&
        s.state.pendingDecision === undefined,
    );

    const taiki = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === fixtureInstanceId("taiki-reveal-played-card"),
    )!;
    expect(taiki.stack.map((card) => card.instanceId)).toEqual([fixtureInstanceId("taiki-reveal-deck-4-card")]);
    expect(olderTamers).toHaveLength(3);
    expect(olderTamers.every((permanent) => permanent.stack.length === 0)).toBe(true);
    expect(
      s.state.players[0]!.hand.some((card) => card.instanceId === fixtureInstanceId("taiki-reveal-deck-3-card")),
    ).toBe(true);
    expect(s.state.players[0]!.deck.slice(-2).map((card) => card.cardId)).toEqual(["BT21-021", "BT21-083"]);
    expect(s.decisions.some(({ req }) => req.kind === "chooseTargets" && req.sourceCardId === "BT10-087")).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
