import fixtureEx13ExamonOptionDp from "./ex13-examon-option-dp.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("EX13 Examon Option DP arena scenario", () => {
  it("keeps placed and later Options without DP after DNA", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx13ExamonOptionDp, [BLUE_DECK, RED_DECK], true);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const wing = human.battleArea.find(({ topCard }) => topCard.cardId === "EX13-021")!;
    const ground = human.battleArea.find(({ topCard }) => topCard.cardId === "EX13-041")!;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [ground.permanentId, wing.permanentId],
        instanceId: fixtureInstanceId("examon-dp-examon-card"),
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 3 &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );

    expect(human.battleArea.find(({ topCard }) => topCard.cardId === "EX13-045")!.currentDP).toBe(25_000);
    expect(human.battleArea.find(({ topCard }) => topCard.cardId === "BT1-013")!.currentDP).toBe(15_000);
    for (const id of ["LM-051", "BT20-093", "BT1-085"]) {
      expect(human.battleArea.find(({ topCard }) => topCard.cardId === id)!.currentDP).toBe(0);
    }

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("examon-dp-later-boost-card") }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        human.battleArea.some(
          ({ topCard }) => topCard.instanceId === fixtureInstanceId("examon-dp-later-boost-card"),
        ) && s.state.pendingDecision === undefined,
    );
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("examon-dp-later-digimon-card") }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        human.battleArea.some(
          ({ topCard }) => topCard.instanceId === fixtureInstanceId("examon-dp-later-digimon-card"),
        ) && s.state.pendingDecision === undefined,
    );

    expect(
      human.battleArea.find(({ topCard }) => topCard.instanceId === fixtureInstanceId("examon-dp-later-boost-card"))!
        .currentDP,
    ).toBe(0);
    expect(
      human.battleArea.find(({ topCard }) => topCard.instanceId === fixtureInstanceId("examon-dp-later-digimon-card"))!
        .currentDP,
    ).toBe(15_000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(human.battleArea.find(({ topCard }) => topCard.cardId === "EX13-045")!.currentDP).toBe(25_000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(
      () => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
    );
    expect(human.battleArea.find(({ topCard }) => topCard.cardId === "EX13-045")!.currentDP).toBe(15_000);
    expect(
      human.battleArea.find(({ topCard }) => topCard.instanceId === fixtureInstanceId("examon-dp-later-digimon-card"))!
        .currentDP,
    ).toBe(5_000);
  });
});
