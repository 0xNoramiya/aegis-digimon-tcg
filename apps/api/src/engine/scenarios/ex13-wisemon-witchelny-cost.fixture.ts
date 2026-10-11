import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "ex13-wisemon-witchelny-cost",
  board: {
    "0": {
      hand: [
        { card: "BT19-036", as: "wisemon-x-card", faceUp: false },
        { card: "BT18-098", as: "wisemon-option-card", faceUp: false },
        { card: "BT8-090", as: "wisemon-new-kari-card", faceUp: false },
        { card: "EX13-034", as: "ex13-wisemon-card", faceUp: false },
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
      security: [
        { card: "BT20-102", as: "wisemon-security-0-card" },
        { card: "BT1-010", as: "wisemon-security-1-card" },
        { card: "BT1-011", as: "wisemon-security-2-card" },
      ],
      battleArea: [
        {
          card: "BT18-036",
          as: "own-wisemon-base",
          top: { card: "BT18-036", as: "own-card-wisemon-base-card" },
          dp: 5000,
          placedByEffect: false,
          under: [
            { card: "EX13-004", as: "own-source-wisemon-base-0-card" },
            { card: "BT18-030", as: "own-source-wisemon-base-1-card" },
          ],
        },
        {
          card: "BT8-090",
          as: "own-wisemon-kari",
          top: { card: "BT8-090", as: "own-card-wisemon-kari-card" },
          dp: 0,
          placedByEffect: false,
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
    },
  },
  memory: 8,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
