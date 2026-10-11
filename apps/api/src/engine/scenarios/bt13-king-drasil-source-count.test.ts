import fixtureBt13KingDrasilSourceCount from "./bt13-king-drasil-source-count.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("stages King Drasil and charges Jesmon for every source added after Omekamon's play", async () => {
  const preferInstanceIds = [fixtureInstanceId("king-drasil-kentaurosmon-card")];
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, declineDigiXros: true, preferInstanceIds },
  );
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startScenarioFixture(fixtureBt13KingDrasilSourceCount);
  try {
    // A breeding area holding only a Digi-Egg has no breeding action, so the turn opens Main.
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const drasil = human.breeding!;
    expect(drasil.topCard.cardId).toBe("BT13-007");
    expect(drasil.stack.map(({ instanceId }) => instanceId)).toEqual([
      fixtureInstanceId("king-drasil-egg-card"),
      fixtureInstanceId("own-source-king-drasil-0-card"),
      fixtureInstanceId("own-source-king-drasil-1-card"),
    ]);
    expect(s.state.memory).toBe(10);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("king-drasil-omekamon-card") }),
    ).toEqual({ ok: true });
    await settle(() =>
      drasil.stack.some(({ instanceId }) => instanceId === fixtureInstanceId("king-drasil-kentaurosmon-card")),
    );
    await settle();
    expect(drasil.stack).toHaveLength(4);
    expect(s.state.memory).toBe(5);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("king-drasil-jesmon-card") }),
    ).toEqual({ ok: true });
    await settle(() =>
      human.battleArea.some(({ topCard }) => topCard.instanceId === fixtureInstanceId("king-drasil-jesmon-card")),
    );
    expect(s.state.memory).toBe(1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
