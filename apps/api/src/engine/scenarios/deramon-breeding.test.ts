import fixtureDeramonBreedingLevel from "./deramon-breeding-level.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("playable Deramon breeding scenario", () => {
  it("refuses Deramon on Pomumon over Yokomon in breeding and accepts it on Parasaurmon for 3", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureDeramonBreedingLevel, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-pomumon"),
          instanceId: fixtureInstanceId("deramon-card"),
          useAlternateCost,
        }),
      ).toMatchObject({ ok: false });
    }
    expect(human.breeding?.topCard.cardId).toBe("EX9-036");
    expect(human.breeding?.stack.map((card) => card.cardId)).toEqual(["BT21-003"]);
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-parasaurmon"),
        instanceId: fixtureInstanceId("deramon-card"),
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.some((permanent) => permanent.topCard.instanceId === fixtureInstanceId("deramon-card")) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.turnSeat).toBe(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
