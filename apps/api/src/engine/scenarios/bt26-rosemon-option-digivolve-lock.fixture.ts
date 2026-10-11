import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "bt26-rosemon-option-digivolve-lock",
  board: {
    "0": {
      hand: [{ card: "BT26-050", as: "rosemon-option-card", faceUp: false }],
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
          card: "BT25-021",
          as: "own-rosemon-data-squad",
          top: { card: "BT25-021", as: "own-card-rosemon-data-squad-card" },
          dp: 2000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: [{ card: "BT1-083", as: "rosemon-trash-cost-card", faceUp: false }],
      deck: dealtCards({
        deck: RED_DECK,
        seat: 1,
        indices: [
          22, 45, 44, 21, 34, 18, 39, 24, 17, 26, 43, 47, 25, 19, 8, 3, 27, 36, 10, 37, 4, 11, 1, 31, 38, 7, 6, 15, 29,
          35, 28, 41, 5, 48, 13, 2, 46, 0, 32, 23, 30, 20, 16, 12, 40,
        ],
      }),
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 2, 3, 0, 1], egg: true, aliasOffset: 50 }),
      trash: [{ card: "BT24-075", as: "rosemon-skullbaluchimon-card" }],
      security: dealtCards({ deck: RED_DECK, seat: 1, indices: [33, 9, 42, 14, 49] }),
      battleArea: [
        {
          card: "BT1-009",
          as: "opponent-rosemon-lock-first",
          top: { card: "BT1-009", as: "opponent-card-rosemon-lock-first-card" },
          dp: 3000,
          placedByEffect: false,
        },
        {
          card: "BT1-012",
          as: "opponent-rosemon-lock-second",
          top: { card: "BT1-012", as: "opponent-card-rosemon-lock-second-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT24-026",
          as: "opponent-rosemon-hyogamon",
          top: { card: "BT24-026", as: "opponent-card-rosemon-hyogamon-card" },
          dp: 4000,
          placedByEffect: false,
          under: [{ card: "BT24-009", as: "opponent-source-rosemon-hyogamon-0-card" }],
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
