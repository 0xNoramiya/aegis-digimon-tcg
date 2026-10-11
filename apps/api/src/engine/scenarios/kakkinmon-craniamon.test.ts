import fixtureKakkinmonCraniamon from "./kakkinmon-craniamon.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const CRANIAMON = fixturePermanentId("own-craniamon");

describe("Kakkinmon and Craniamon dev scenario", () => {
  it("suspends Craniamon for Kakkinmon's draw, then Craniamon's trigger has no DUAL target", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferInstanceIds: [CRANIAMON] },
    );
    layScenarioFixture(s.state, fixtureKakkinmonCraniamon, [BLUE_DECK, RED_DECK], true);
    await s.ready();
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const handBefore = s.state.players[0]!.hand.length;
    const eventsBefore = s.events.length;

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    const events = s.events.slice(eventsBefore);
    expect(events).toContainEqual(expect.objectContaining({ kind: "effectResolved", sourceCardId: "P-245" }));
    expect(events).toContainEqual(
      expect.objectContaining({ kind: "cardsMoved", instanceIds: [CRANIAMON], to: "suspended" }),
    );
    expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
    expect(events).toContainEqual(
      expect.objectContaining({ kind: "effectHadNoEffect", sourceCardId: "EX13-062", timing: "whenSuspended" }),
    );
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["ST23-09", "BT25-057"]);
  });
});
