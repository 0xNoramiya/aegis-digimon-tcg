import fixtureEx13LeopardmonSuspendedTarget from "./ex13-leopardmon-suspended-target.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const RESTING_TARGET = fixtureInstanceId("opponent-card-leopardmon-resting-card");
const LOWEST_TARGET = fixtureInstanceId("opponent-card-leopardmon-lowest-card");
const ALLY = fixtureInstanceId("own-card-leopardmon-ally-card");

describe("EX13 Leopardmon arena scenario", () => {
  it("offers and suspends an already suspended Digimon", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [RESTING_TARGET] },
    );
    layScenarioFixture(s.state, fixtureEx13LeopardmonSuspendedTarget, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 12;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("leopardmon-ex13-card") }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some(({ instanceId }) => instanceId === LOWEST_TARGET));
    await settle(() => s.state.pendingDecision === undefined);

    const permanentOf = (instanceId: string) =>
      [...s.state.players[0]!.battleArea, ...s.state.players[1]!.battleArea].find(
        ({ topCard }) => topCard.instanceId === instanceId,
      );
    const suspendChoice = s.decisions.find(
      ({ req }) => req.kind === "chooseTargets" && req.options?.targetFate === "suspend",
    );
    expect(suspendChoice?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([permanentOf(RESTING_TARGET)!.permanentId, permanentOf(ALLY)!.permanentId]),
    );
    expect(permanentOf(RESTING_TARGET)?.isSuspended).toBe(true);
    expect(permanentOf(ALLY)?.isSuspended).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(LOWEST_TARGET);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
