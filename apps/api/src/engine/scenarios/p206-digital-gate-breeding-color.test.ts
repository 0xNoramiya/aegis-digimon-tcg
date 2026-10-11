import fixtureP206DigitalGateBreedingColor from "./p206-digital-gate-breeding-color.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("P-206 Digital Gate Open arena scenario", () => {
  it("plays a Tamer matching a breeding-area Digimon's color", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureP206DigitalGateBreedingColor, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    expect(human.breeding?.topCard.instanceId).toBe(fixtureInstanceId("own-card-p206-breeding-card"));
    const gate = human.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("own-card-p206-gate-card"),
    )!;
    const delay = observe(s.engine)
      .activatableEffects(gate)
      .find((effect) => /delay/i.test(effect.description ?? ""))!;
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delay.instanceId!,
        effectKey: delay.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.some(({ topCard }) => topCard.instanceId === fixtureInstanceId("p206-tai-card")) &&
        s.state.pendingDecision === undefined,
    );

    const taiPlayed = human.battleArea.some(({ topCard }) => topCard.instanceId === fixtureInstanceId("p206-tai-card"));
    const mattInHand = human.hand.some(({ instanceId }) => instanceId === fixtureInstanceId("p206-matt-card"));
    const gateTrashed = human.trash.some(
      ({ instanceId }) => instanceId === fixtureInstanceId("own-card-p206-gate-card"),
    );

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(taiPlayed).toBe(true);
    expect(mattInHand).toBe(true);
    expect(gateTrashed).toBe(true);
  });
});
