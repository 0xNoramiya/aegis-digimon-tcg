import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "keyword-pacing-digi-burst-reduce",
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
          card: "BT4-046",
          as: "own-keyword-stack-0",
          top: { card: "BT4-046", as: "own-card-keyword-stack-0-card" },
          dp: 7000,
          placedByEffect: false,
          under: [
            { card: "BT1-006", as: "own-source-keyword-stack-0-0-card" },
            { card: "ST3-02", as: "own-source-keyword-stack-0-1-card" },
            { card: "BT1-051", as: "own-source-keyword-stack-0-2-card" },
          ],
        },
        {
          card: "BT4-046",
          as: "own-keyword-stack-1",
          top: { card: "BT4-046", as: "own-card-keyword-stack-1-card" },
          dp: 7000,
          placedByEffect: false,
          under: [
            { card: "BT1-006", as: "own-source-keyword-stack-1-0-card" },
            { card: "ST3-02", as: "own-source-keyword-stack-1-1-card" },
            { card: "BT1-051", as: "own-source-keyword-stack-1-2-card" },
          ],
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
          card: "ST1-10",
          as: "opponent-keyword-stack-target",
          top: { card: "ST1-10", as: "opponent-card-keyword-stack-target-card" },
          dp: 12000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 8,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
