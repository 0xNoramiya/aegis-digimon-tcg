import fixtureEx13CraniamonWeregarurumonAssembly from "./ex13-craniamon-weregarurumon-assembly.fixture.js";
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

describe("Craniamon WereGarurumon Assembly arena scenario", () => {
  it("plays Craniamon with WereGarurumon as the Lv.5 material for 7", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
    layScenarioFixture(s.state, fixtureEx13CraniamonWeregarurumonAssembly, [BLUE_DECK, RED_DECK], true);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);

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
    expect(craniamon.stack.map(({ instanceId }) => instanceId)).toEqual([...MATERIALS].reverse());
    expect(craniamon.stack.map(({ cardId }) => cardId)).toEqual(["EX13-047", "EX13-051", "BT23-056"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      fixtureInstanceId("craniamon-inherited-blocker-card"),
      fixtureInstanceId("craniamon-blue-blocker-card"),
    ]);
    await settle(() => s.state.turnSeat === 1 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(7);
  });
});
