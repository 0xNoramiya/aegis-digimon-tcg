import fixtureBt24SkullbaluchimonSimultaneousDelete from "./bt24-skullbaluchimon-simultaneous-delete.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("BT24 SkullBaluchimon simultaneous delete arena scenario", () => {
  it("deletes the bot's level 3 and level 4 Digimon in one deletion", async () => {
    const deletions: string[][] = [];
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent(event) {
          if (event.kind === "cardsMoved" && event.deletedPermanents !== undefined) {
            deletions.push(event.deletedPermanents.map(({ cardId }) => cardId));
          }
        },
      },
    );
    layScenarioFixture(s.state, fixtureBt24SkullbaluchimonSimultaneousDelete, [BLUE_DECK, RED_DECK], true);

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("skullbaluchimon-card") }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(deletions).toEqual([["BT1-009", "BT1-014"]]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      fixtureInstanceId("skullbaluchimon-cost-card"),
    );

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
