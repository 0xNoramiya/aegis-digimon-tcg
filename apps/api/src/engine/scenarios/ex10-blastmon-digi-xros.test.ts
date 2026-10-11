import fixtureEx10BlastmonDigixros from "./ex10-blastmon-digixros.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const MATERIALS = [
  fixtureInstanceId("blastmon-skullknightmon-card"),
  fixtureInstanceId("blastmon-deadlyaxemon-card"),
  fixtureInstanceId("blastmon-chuuchuumon-card"),
];

describe("EX10 Blastmon DigiXros arena scenario", () => {
  it("places 3 [Bagra Army] materials and rejects a fourth", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx10BlastmonDigixros, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(7);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("blastmon-card"),
        digiXros: { materialInstanceIds: [...MATERIALS, fixtureInstanceId("blastmon-damemon-card")] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("blastmon-card"),
        digiXros: { materialInstanceIds: MATERIALS },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          ({ topCard }) => topCard?.instanceId === fixtureInstanceId("blastmon-card"),
        ) && s.state.pendingDecision === undefined,
    );

    const blastmon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === fixtureInstanceId("blastmon-card"),
    )!;
    expect(blastmon.stack.map(({ instanceId }) => instanceId).sort()).toEqual([...MATERIALS].sort());
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      fixtureInstanceId("blastmon-damemon-card"),
    );

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
