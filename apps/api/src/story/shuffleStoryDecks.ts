import type { ScenarioFixture } from "#api/engine/scenario/types";
import { makeRng, seatSeed, shuffleInPlace } from "#api/engine/setup";

type Params = { fixture: ScenarioFixture; seed: number };

export function shuffleStoryDecks({ fixture, seed }: Params): void {
  for (const seat of [0, 1] as const) {
    const board = fixture.board[seat];
    const rng = makeRng(seatSeed(seed, seat));
    if (board?.deck) {
      shuffleInPlace(board.deck, rng);
    }
    if (board?.eggDeck) {
      shuffleInPlace(board.eggDeck, rng);
    }
  }
}
