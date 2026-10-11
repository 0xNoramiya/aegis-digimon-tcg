import fixtureBt25BeelstarmonOptionTrashTrigger from "./bt25-beelstarmon-option-trash-trigger.fixture.js";
import fixtureEx7DeputymonOptionTrashTrigger from "./ex7-deputymon-option-trash-trigger.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("arena scenarios", () => {
  it("BT25 BeelStarmon's unsuspend cost fires Hurricane Screw Shot's memory gain", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Use an Option", "Arts Digivolve"] },
    );
    layScenarioFixture(s.state, fixtureBt25BeelstarmonOptionTrashTrigger, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const beelStarmon = human.battleArea.find(
      ({ permanentId }) => permanentId === fixturePermanentId("own-beelstarmon-bt25"),
    )!;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: beelStarmon.permanentId,
        target: { kind: "permanent", permanentId: fixturePermanentId("opponent-beelstarmon-bt25-target") },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0 && s.state.pendingDecision === undefined);
    const unsuspended = !beelStarmon.isSuspended;
    const screwShotTrashed = human.trash.some(({ cardId }) => cardId === "EX7-071");
    const memory = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(unsuspended).toBe(true);
    expect(screwShotTrashed).toBe(true);
    expect(memory).toBe(6);
  });

  it("EX7 Deputymon's trash fires Bind Red Trigger's deletion", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx7DeputymonOptionTrashTrigger, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fixturePermanentId("own-deputymon-base"),
        instanceId: fixtureInstanceId("deputymon-card"),
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0 && s.state.pendingDecision === undefined);
    const bindRedTrashed = human.trash.some(({ cardId }) => cardId === "P-180");
    const memory = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(bindRedTrashed).toBe(true);
    expect(
      opponent.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("opponent-card-deputymon-target-card")),
    ).toBe(true);
    expect(memory).toBe(3);
  });
});
