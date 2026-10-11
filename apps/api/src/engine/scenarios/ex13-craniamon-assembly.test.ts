import fixtureEx13CraniamonAssembly from "./ex13-craniamon-assembly.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const MATERIALS = [
  fixtureInstanceId("craniamon-lv5-card"),
  fixtureInstanceId("craniamon-lv4-card"),
  fixtureInstanceId("craniamon-lv3-card"),
];

describe("EX13 Craniamon Assembly arena scenario", () => {
  it("plays Craniamon by Assembly from black printed-Blocker Lv.5/Lv.4/Lv.3 materials", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx13CraniamonAssembly, [BLUE_DECK, RED_DECK], true);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("craniamon-card") })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("craniamon-card"),
        assembly: {
          materialInstanceIds: [
            fixtureInstanceId("craniamon-lv5-card"),
            fixtureInstanceId("craniamon-lv4-card"),
            fixtureInstanceId("craniamon-inherited-blocker-card"),
          ],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("craniamon-card"),
        assembly: { materialInstanceIds: MATERIALS },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(
          ({ topCard }) => topCard.instanceId === fixtureInstanceId("craniamon-card"),
        ),
    );

    const craniamon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === fixtureInstanceId("craniamon-card"),
    )!;
    expect(craniamon.stack.map(({ instanceId }) => instanceId).sort()).toEqual([...MATERIALS].sort());
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual([
      fixtureInstanceId("craniamon-blue-blocker-card"),
      fixtureInstanceId("craniamon-inherited-blocker-card"),
    ]);
    await settle(() => s.state.turnSeat === 1);
    expect(s.state.memory).toBe(7);
  });
});
