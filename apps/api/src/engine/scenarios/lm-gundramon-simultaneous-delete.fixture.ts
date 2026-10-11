import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "lm-gundramon-simultaneous-delete",
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
          card: "LM-067",
          as: "own-gundramon",
          top: { card: "LM-067", as: "own-card-gundramon-card" },
          dp: 13000,
          placedByEffect: false,
          under: [
            { card: "BT25-078", as: "own-source-gundramon-0-card" },
            { card: "BT25-082", as: "own-source-gundramon-1-card" },
            { card: "BT6-068", as: "own-source-gundramon-2-card" },
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
          card: "BT1-009",
          as: "opponent-gundramon-target-a",
          top: { card: "BT1-009", as: "opponent-card-gundramon-target-a-card" },
          dp: 3000,
          placedByEffect: false,
        },
        {
          card: "BT1-013",
          as: "opponent-gundramon-target-b",
          top: { card: "BT1-013", as: "opponent-card-gundramon-target-b-card" },
          dp: 5000,
          placedByEffect: false,
        },
        {
          card: "BT1-027",
          as: "opponent-gundramon-target-c",
          top: { card: "BT1-027", as: "opponent-card-gundramon-target-c-card" },
          dp: 4000,
          placedByEffect: false,
        },
        {
          card: "BT6-065",
          as: "opponent-gundramon-too-big",
          top: { card: "BT6-065", as: "opponent-card-gundramon-too-big-card" },
          dp: 11000,
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
