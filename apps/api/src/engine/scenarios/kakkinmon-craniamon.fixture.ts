import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "kakkinmon-craniamon",
  board: {
    "0": {
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
      battleArea: [
        {
          card: "EX13-051",
          as: "own-kakkinmon",
          top: { card: "EX13-051", as: "own-card-kakkinmon-card" },
          dp: 5000,
          placedByEffect: false,
          under: [
            { card: "P-245", as: "own-source-kakkinmon-0-card" },
            { card: "EX13-047", as: "own-source-kakkinmon-1-card" },
          ],
        },
        {
          card: "EX13-062",
          as: "own-craniamon",
          top: { card: "EX13-062", as: "own-card-craniamon-card" },
          dp: 12000,
          placedByEffect: false,
          under: [{ card: "BT15-061", as: "own-source-craniamon-0-card" }],
        },
      ],
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
          card: "ST23-09",
          as: "opponent-atratusmon",
          top: { card: "ST23-09", as: "opponent-card-atratusmon-card" },
          dp: 12000,
          placedByEffect: false,
        },
        {
          card: "BT25-057",
          as: "opponent-monarchlizamon",
          top: { card: "BT25-057", as: "opponent-card-monarchlizamon-card" },
          dp: 8000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
