import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "grademon-dual-immunity",
  board: {
    "0": {
      hand: [
        { card: "EX13-057", as: "grademon-dual-immunity-0-hand-0-card", faceUp: false },
        { card: "BT1-082", as: "grademon-dual-immunity-0-hand-1-card", faceUp: false },
      ],
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
          34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [4, 3, 2, 1, 0] }),
      battleArea: [
        {
          card: "EX13-055",
          as: "grademon-dual-immunity-0-field-0",
          top: { card: "EX13-055", as: "grademon-dual-immunity-0-field-0-card" },
          dp: 5000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "BT20-051", as: "grademon-dual-immunity-0-source-0-0-card" }],
        },
      ],
    },
    "1": {
      hand: [
        { card: "EX13-065", as: "grademon-dual-immunity-1-hand-0-card", faceUp: false },
        { card: "EX13-066", as: "grademon-dual-immunity-1-hand-1-card", faceUp: false },
      ],
      deck: dealtCards({
        deck: RED_DECK,
        seat: 1,
        indices: [
          5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
          34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        ],
      }),
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "grademon-dual-immunity-1-security-0-card" },
        { card: "BT1-010", as: "grademon-dual-immunity-1-security-1-card" },
        { card: "BT1-011", as: "grademon-dual-immunity-1-security-2-card" },
      ],
      battleArea: [
        {
          card: "BT6-082",
          as: "grademon-dual-immunity-1-field-0",
          top: { card: "BT6-082", as: "grademon-dual-immunity-1-field-0-card" },
          dp: 3000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
