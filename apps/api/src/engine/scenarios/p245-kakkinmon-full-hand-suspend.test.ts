import fixtureP245KakkinmonFullHandSuspend from "./p245-kakkinmon-full-hand-suspend.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("P-245 Kakkinmon full hand arena scenario", () => {
  it("suspends Craniamon with 8 cards in hand, skips the draw, and fires the sweep", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureP245KakkinmonFullHandSuspend, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const craniamon = human.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("own-card-kakkinmon-craniamon-card"),
    )!;
    const botTopCards = () => bot.battleArea.map(({ topCard }) => topCard.instanceId);
    expect(human.hand).toHaveLength(8);
    const deckBeforeEnd = human.deck.length;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(
      () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
    );

    expect(
      s.events.some(
        (event) =>
          event.kind === "cardsMoved" && event.to === "suspended" && event.instanceIds.includes(craniamon.permanentId),
      ),
    ).toBe(true);
    expect(craniamon.isSuspended).toBe(false);
    expect(botTopCards()).toEqual([fixtureInstanceId("opponent-card-kakkinmon-dearer-card")]);
    expect(human.hand).toHaveLength(8);
    expect(human.deck).toHaveLength(deckBeforeEnd);
    expect(
      s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "P-245" && event.seat === 0),
    ).toBe(true);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
