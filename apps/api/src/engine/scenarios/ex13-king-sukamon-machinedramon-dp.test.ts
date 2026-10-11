import fixtureEx13KingsukamonMachinedramonDp from "./ex13-kingsukamon-machinedramon-dp.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const TARGET = fixturePermanentId("kingsukamon-machinedramon-target");

describe("EX13 KingSukamon vs Machinedramon arena scenario", () => {
  it("rewrites Machinedramon to a white 3000 DP [Sukamon]", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureEx13KingsukamonMachinedramonDp, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const target = () => s.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === TARGET)!;
    expect(target().currentDP).toBe(11000);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fixtureInstanceId("kingsukamon-machinedramon-king-card"),
      }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some(
          ({ instanceId }) => instanceId === fixtureInstanceId("kingsukamon-machinedramon-fee-card"),
        ),
    );

    expect(observe(s.engine).effectiveNames(target())).toEqual(["sukamon"]);
    expect(observe(s.engine).effectiveColors(target())).toEqual(["White"]);
    expect(target().currentDP).toBe(3000);
    expect(target().originalDPOverride).toBe(3000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
