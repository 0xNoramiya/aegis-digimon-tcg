import fixtureBt24AsunaReturnPlay from "./bt24-asuna-return-play.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("Asuna return-to-deck play arena scenario", () => {
  it("returns Asuna to the deck bottom, then plays the other Asuna from the trash", async () => {
    const s = setupEngine({ 0: {} }, { autoSelectCards: true, autoAcceptOptional: true });
    layScenarioFixture(s.state, fixtureBt24AsunaReturnPlay, [BLUE_DECK, RED_DECK], true);
    await s.ready();
    // The human passes with 0 memory, so the bot starts its turn with 3.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    const bot = s.state.players[1]!;
    const moves = s.events.filter((event) => event.kind === "cardsMoved" || event.kind === "cardPlayed");
    const returned = moves.findIndex((event) => event.kind === "cardsMoved" && event.to === "deckBottom");
    const played = moves.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT25-092");
    expect(moves[returned]).toMatchObject({
      returnedPermanents: [{ permanentId: fixturePermanentId("opp-asuna"), cardId: "BT24-088" }],
    });
    expect(played).toBeGreaterThan(returned);
    expect(moves[played]).toMatchObject({ fromZone: "trash", seat: 1 });
    expect(bot.battleArea.some((permanent) => permanent.permanentId === fixturePermanentId("opp-asuna"))).toBe(false);
    expect(bot.battleArea.some((permanent) => permanent.topCard.cardId === "BT25-092")).toBe(true);
  });
});
