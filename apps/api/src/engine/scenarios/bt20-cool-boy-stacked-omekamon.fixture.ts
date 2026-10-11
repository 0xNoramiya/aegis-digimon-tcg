import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt20-cool-boy-stacked-omekamon",
  board: {
    "0": {
      hand: [
        { card: "BT20-083", as: "bt20-cool-boy-omekamon-first-card", faceUp: false },
        { card: "BT20-083", as: "bt20-cool-boy-omekamon-second-card", faceUp: false },
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
      battleArea: [
        {
          card: "BT13-077",
          as: "own-bt20-cool-boy-craniamon",
          top: { card: "BT13-077", as: "own-card-bt20-cool-boy-craniamon-card" },
          dp: 13000,
          placedByEffect: false,
        },
        {
          card: "BT20-091",
          as: "own-bt20-cool-boy-first",
          top: { card: "BT20-091", as: "own-card-bt20-cool-boy-first-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT20-091",
          as: "own-bt20-cool-boy-second",
          top: { card: "BT20-091", as: "own-card-bt20-cool-boy-second-card" },
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
      battleArea: [
        {
          card: "BT1-084",
          as: "opponent-bt20-cool-boy-attacker",
          top: { card: "BT1-084", as: "opponent-card-bt20-cool-boy-attacker-card" },
          dp: 15000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 0,
  turnSeat: 1,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
