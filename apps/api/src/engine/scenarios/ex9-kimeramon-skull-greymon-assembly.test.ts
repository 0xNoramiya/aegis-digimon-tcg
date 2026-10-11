import fixtureEx9KimeramonSkullgreymonAssembly from "./ex9-kimeramon-skullgreymon-assembly.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const MATERIALS = [
  ...["EX9-009", "EX9-010", "EX9-017", "EX9-025", "EX9-026", "EX9-028"].map((cardId) =>
    fixtureVariant(
      {
        "EX9-009": fixtureInstanceId("kimeramon-EX9-009-card"),
        "EX9-010": fixtureInstanceId("kimeramon-EX9-010-card"),
        "EX9-017": fixtureInstanceId("kimeramon-EX9-017-card"),
        "EX9-025": fixtureInstanceId("kimeramon-EX9-025-card"),
        "EX9-026": fixtureInstanceId("kimeramon-EX9-026-card"),
        "EX9-028": fixtureInstanceId("kimeramon-EX9-028-card"),
        skullgreymon: fixtureInstanceId("kimeramon-skullgreymon-card"),
      },
      cardId,
    ),
  ),
  fixtureInstanceId("kimeramon-skullgreymon-card"),
];

describe("EX9 Kimeramon SkullGreymon Assembly arena scenario", () => {
  it("accepts SkullGreymon as the seventh Lv.4 [DM] material", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx9KimeramonSkullgreymonAssembly, [BLUE_DECK, RED_DECK], true);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("kimeramon-card"),
        assembly: { materialInstanceIds: MATERIALS },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(
          ({ topCard }) => topCard.instanceId === fixtureInstanceId("kimeramon-card"),
        ),
    );
    const kimeramon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("kimeramon-card"),
    )!;
    expect(kimeramon.stack.map(({ instanceId }) => instanceId).sort()).toEqual([...MATERIALS].sort());
    await settle(() => s.state.turnSeat === 1);
    expect(s.state.memory).toBe(3);
  });
});
