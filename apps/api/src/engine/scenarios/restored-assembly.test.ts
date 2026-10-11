import fixtureBt24MasterblimpmonAssembly from "./bt24-masterblimpmon-assembly.fixture.js";
import fixtureBt22BoltmonAssembly from "./bt22-boltmon-assembly.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function mainPhaseIn(scenarioId: ScenarioFixture) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
  layScenarioFixture(s.state, scenarioId, [BLUE_DECK, RED_DECK], true);
  s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(s.state.memory).toBe(0);
  return s;
}

describe("Assembly recipes restored from the official images (arena scenarios)", () => {
  it("plays BT24-062 MasterBlimpmon with its alternative [TS] Tamer recipe", async () => {
    const s = await mainPhaseIn(fixtureBt24MasterblimpmonAssembly);
    const playWith = (materialInstanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("masterblimpmon-card"),
        assembly: { materialInstanceIds },
      });

    expect(playWith([fixtureInstanceId("masterblimpmon-ts-digimon-card")])).toEqual({
      ok: false,
      reason: "invalid-material",
    });
    expect(playWith([fixtureInstanceId("masterblimpmon-ts-tamer-card")])).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        ({ topCard }) => topCard.instanceId === fixtureInstanceId("masterblimpmon-card"),
      ),
    );
    const masterBlimpmon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("masterblimpmon-card"),
    )!;
    expect(masterBlimpmon.stack.map(({ instanceId }) => instanceId)).toEqual([
      fixtureInstanceId("masterblimpmon-ts-tamer-card"),
    ]);
    await settle(() => s.state.turnSeat === 1);
    expect(s.state.memory).toBe(5);
  });

  it("plays BT22-078 Boltmon only with five different card numbers", async () => {
    const s = await mainPhaseIn(fixtureBt22BoltmonAssembly);
    const distinct = ["BT11-084", "BT15-009", "BT15-015", "BT15-069", "BT18-030"].map((cardId) =>
      fixtureVariant(
        {
          "BT11-084": fixtureInstanceId("boltmon-BT11-084-card"),
          "BT15-009": fixtureInstanceId("boltmon-BT15-009-card"),
          "BT15-015": fixtureInstanceId("boltmon-BT15-015-card"),
          "BT15-069": fixtureInstanceId("boltmon-BT15-069-card"),
          "BT18-030": fixtureInstanceId("boltmon-BT18-030-card"),
          "repeated-number": fixtureInstanceId("boltmon-repeated-number-card"),
        },
        cardId,
      ),
    );
    const playWith = (materialInstanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("boltmon-card"),
        assembly: { materialInstanceIds },
      });

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("boltmon-card") })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
    expect(playWith([...distinct.slice(0, 4), fixtureInstanceId("boltmon-repeated-number-card")])).toEqual({
      ok: false,
      reason: "invalid-material",
    });
    expect(playWith(distinct)).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === fixtureInstanceId("boltmon-card")),
    );
    await settle(() => s.state.turnSeat === 1);
    expect(s.state.memory).toBe(6);
  });
});
