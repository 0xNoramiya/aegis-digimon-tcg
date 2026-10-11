import fixtureP220MillenniummonAssembly from "./p220-millenniummon-assembly.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const MATERIALS = [
  fixtureInstanceId("millenniummon-lv3-card"),
  fixtureInstanceId("millenniummon-lv4-card"),
  fixtureInstanceId("millenniummon-lv5-card"),
];

describe("P-220 Millenniummon Assembly arena scenario", () => {
  it("plays Millenniummon by Assembly from three [Composite]/[Ver.3] Digimon of different levels", async () => {
    // Decline "you may delete 1 Digimon": with no opponent Digimon, auto-select would delete Millenniummon.
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
    layScenarioFixture(s.state, fixtureP220MillenniummonAssembly, [BLUE_DECK, RED_DECK], true);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);

    const playWith = (materialInstanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("millenniummon-card"),
        assembly: { materialInstanceIds },
      });

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("millenniummon-card") })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
    expect(
      playWith([
        fixtureInstanceId("millenniummon-lv3-card"),
        fixtureInstanceId("millenniummon-same-level-card"),
        fixtureInstanceId("millenniummon-lv5-card"),
      ]),
    ).toEqual({
      ok: false,
      reason: "invalid-material",
    });
    expect(
      playWith([
        fixtureInstanceId("millenniummon-lv3-card"),
        fixtureInstanceId("millenniummon-lv4-card"),
        fixtureInstanceId("millenniummon-no-trait-card"),
      ]),
    ).toEqual({
      ok: false,
      reason: "invalid-material",
    });

    expect(playWith(MATERIALS)).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(
          ({ topCard }) => topCard.instanceId === fixtureInstanceId("millenniummon-card"),
        ),
    );
    const millenniummon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("millenniummon-card"),
    )!;
    expect(millenniummon.stack.map(({ instanceId }) => instanceId).sort()).toEqual([...MATERIALS].sort());
    await settle(() => s.state.turnSeat === 1);
    expect(s.state.memory).toBe(8);
  });
});
