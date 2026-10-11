import fixtureBt10TaikiX7XrosHeart from "./bt10-taiki-x7-xros-heart.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("arena places the lone X7 under Taiki after adding Kotone", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoSelectCards: true,
      preferInstanceIds: [fixtureInstanceId("x7-deck-2-card")],
    },
  );
  layScenarioFixture(s.state, fixtureBt10TaikiX7XrosHeart, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("x7-taiki-card") })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT10-087") &&
        s.state.pendingDecision === undefined,
    );
    const taiki = s.state.players[0]!.battleArea.find(
      (p) => p.topCard.instanceId === fixtureInstanceId("x7-taiki-card"),
    )!;
    expect(taiki.stack.map((c) => c.cardId)).toEqual(["AD1-006"]);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === fixtureInstanceId("x7-deck-2-card"))).toBe(true);
    expect(s.state.players[0]!.deck.slice(-2).map((c) => c.cardId)).toEqual(["BT21-083", "BT8-097"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
