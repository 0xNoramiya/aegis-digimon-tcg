import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt22-akemi-battle-mother",
  board: {
    "0": {
      hand: [{ card: "BT1-009", as: "hand-card", faceUp: false }],
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          8, 31, 15, 1, 20, 4, 43, 9, 22, 17, 26, 12, 47, 34, 5, 11, 30, 35, 48, 25, 0, 27, 44, 29, 40, 7, 32, 19, 2,
          41, 46, 14, 16, 36, 39, 23, 28, 49, 3, 6, 37, 18, 33, 24, 21,
        ],
      }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
      battleArea: [
        {
          card: "BT22-095",
          as: "own-akemi",
          top: { card: "BT22-095", as: "own-card-akemi-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT22-007",
          as: "own-battle",
          top: { card: "BT22-007", as: "own-card-battle-card" },
          dp: 0,
          placedByEffect: false,
          under: [{ card: "BT22-079", as: "own-source-battle-0-card" }],
        },
        {
          card: "BT22-007",
          as: "own-second",
          top: { card: "BT22-007", as: "own-card-second-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
      breeding: {
        card: "BT22-007",
        as: "own-breeding",
        top: { card: "BT22-007", as: "own-card-breeding-card" },
        dp: 0,
        placedByEffect: false,
        under: [{ card: "BT22-079", as: "own-source-breeding-0-card" }],
      },
    },
    "1": {
      deck: dealtCards({
        deck: RED_DECK,
        seat: 1,
        indices: [
          22, 45, 44, 21, 34, 18, 39, 24, 17, 26, 43, 47, 25, 19, 8, 3, 27, 36, 10, 37, 4, 11, 1, 31, 38, 7, 6, 15, 29,
          35, 28, 41, 5, 48, 13, 2, 46, 0, 32, 23, 30, 20, 16, 12, 40,
        ],
      }),
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 2, 3, 0, 1], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: RED_DECK, seat: 1, indices: [33, 9, 42, 14, 49] }),
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
