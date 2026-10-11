import fixtureCreepymonXEndTurn from "./creepymon-x-end-turn.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("playable Creepymon (X Antibody) scenario", () => {
  it("digivolves into BT24-078 from the trash during the end-of-turn attack", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureCreepymonXEndTurn, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const [human, bot] = [s.state.players[0]!, s.state.players[1]!];
    expect(bot.trash).toHaveLength(9);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea[0]?.topCard.cardId === "BT24-078" &&
        bot.security.length === 3 &&
        s.state.pendingDecision === undefined,
    );
    const creepymon = human.battleArea[0]!;
    expect(creepymon.permanentId).toBe(fixturePermanentId("own-creepymon"));
    expect(creepymon.stack.map((card) => card.cardId)).toEqual(["EX10-046", "EX10-009"]);
    expect(human.trash.map((card) => card.cardId)).not.toContain("BT24-078");
    expect(bot.trash.length).toBeGreaterThanOrEqual(12);

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    s.engine.expireMatchTimer(1);
    await loop;
  });
});
