import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "st17-magnamon-merciful-colors",
  board: {
    "0": {
      hand: [
        { card: "P-117", as: "magnamon-colors-veemon-card", faceUp: false },
        { card: "ST17-13", as: "magnamon-colors-magnamon-card", faceUp: false },
      ],
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          8, 31, 15, 1, 20, 4, 43, 9, 22, 17, 26, 12, 47, 34, 5, 11, 30, 35, 48, 25, 0, 27, 44, 29, 40, 7, 32, 19, 2,
          41, 46, 14, 16, 36, 39, 23, 28, 49, 3, 6, 37, 18, 33, 24, 21,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [42, 10, 45, 38, 13] }),
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
      battleArea: [
        {
          card: "EX13-077",
          as: "opponent-magnamon-colors-merciful",
          top: { card: "EX13-077", as: "opponent-card-magnamon-colors-merciful-card" },
          dp: 16000,
          placedByEffect: false,
          under: [
            { card: "ST20-06", as: "opponent-source-magnamon-colors-merciful-0-card" },
            { card: "ST21-08", as: "opponent-source-magnamon-colors-merciful-1-card" },
            { card: "ST20-02", as: "opponent-source-magnamon-colors-merciful-2-card" },
            { card: "BT21-061", as: "opponent-source-magnamon-colors-merciful-3-card" },
            { card: "EX9-019", as: "opponent-source-magnamon-colors-merciful-4-card" },
            { card: "AD1-025", as: "opponent-source-magnamon-colors-merciful-5-card" },
          ],
        },
      ],
    },
  },
  memory: 6,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
