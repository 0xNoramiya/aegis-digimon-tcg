import fixtureFaceUpSecurity from "./face-up-security.fixture.js";
import { CATALOG_DECKS, GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layScenarioFixture } from "../scenario/fixture.js";
import { syncPublicCounts } from "../state/visibility.js";
import "../../cards/index.js";

function catalogDeck(deckId: string) {
  const deck = CATALOG_DECKS.find((entry) => entry.deckId === deckId);
  if (deck === undefined) throw new Error(`Missing catalog deck ${deckId}`);
  return {
    mainDeck: [...deck.decklist.mainDeck],
    eggDeck: [...deck.decklist.eggDeck],
  };
}

describe("arena-face-up-security dev scenario", () => {
  it("publishes two face-up cards in the opponent security stack", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layScenarioFixture(
      state,
      fixtureFaceUpSecurity,
      [catalogDeck("bt26-dgo-2026-08-28-7-chronomon"), catalogDeck("bt26-dgo-2026-08-28-8-plutomon")],
      true,
    );
    syncPublicCounts(state);

    const opponent = state.players[1] as PlayerState;
    expect(opponent.security).toHaveLength(5);
    expect(opponent.security.filter(({ faceUp }) => faceUp)).toHaveLength(2);
    expect(opponent.securityView.filter(({ faceUp }) => faceUp)).toHaveLength(2);
    for (const card of opponent.securityView.filter(({ faceUp }) => faceUp)) {
      expect(card.instanceId).toBeTruthy();
      expect(card.cardId).toBeTruthy();
    }
  });
});
