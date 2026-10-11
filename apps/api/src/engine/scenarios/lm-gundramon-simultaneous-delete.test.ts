import fixtureLmGundramonSimultaneousDelete from "./lm-gundramon-simultaneous-delete.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("LM Gundramon simultaneous delete arena scenario", () => {
  it("trashes 3 digivolution cards, then deletes 3 of the bot's Digimon in one deletion", async () => {
    const deletions: string[][] = [];
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        onEvent(event) {
          if (event.kind === "cardsMoved" && event.deletedPermanents !== undefined) {
            deletions.push(event.deletedPermanents.map(({ cardId }) => cardId));
          }
        },
      },
    );
    layScenarioFixture(s.state, fixtureLmGundramonSimultaneousDelete, [BLUE_DECK, RED_DECK], true);

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fixturePermanentId("own-gundramon"),
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(deletions[0]).toEqual(["BT1-009", "BT1-013", "BT1-027"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT6-065"]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
