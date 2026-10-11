import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "dantemon-seven-code",
  board: {
    "0": {
      hand: [
        { card: "BT26-102", as: "dantemon-seven-code-0-hand-0-card", faceUp: false },
        { card: "BT26-086", as: "dantemon-seven-code-0-hand-1-card", faceUp: false },
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
      trash: [
        { card: "BT26-019", as: "dantemon-seven-code-0-trash-0-card" },
        { card: "BT26-028", as: "dantemon-seven-code-0-trash-1-card" },
        { card: "BT26-037", as: "dantemon-seven-code-0-trash-2-card" },
        { card: "BT26-051", as: "dantemon-seven-code-0-trash-3-card" },
        { card: "BT26-084", as: "dantemon-seven-code-0-trash-4-card" },
        { card: "BT26-010", as: "dantemon-seven-code-0-trash-5-card" },
        { card: "BT26-063", as: "dantemon-seven-code-0-trash-6-card" },
      ],
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [4, 3, 2, 1, 0] }),
      battleArea: [
        {
          card: "BT26-010",
          as: "dantemon-seven-code-0-field-0",
          top: { card: "BT26-010", as: "dantemon-seven-code-0-field-0-card" },
          dp: 4000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "BT26-007", as: "dantemon-seven-code-0-source-0-0-card" }],
        },
      ],
    },
    "1": {
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
        { card: "BT1-009", as: "dantemon-seven-code-1-security-0-card" },
        { card: "BT1-010", as: "dantemon-seven-code-1-security-1-card" },
        { card: "BT1-011", as: "dantemon-seven-code-1-security-2-card" },
        { card: "BT1-009", as: "dantemon-seven-code-1-security-3-card" },
        { card: "BT1-010", as: "dantemon-seven-code-1-security-4-card" },
      ],
      battleArea: [
        {
          card: "BT1-080",
          as: "dantemon-seven-code-1-field-0",
          top: { card: "BT1-080", as: "dantemon-seven-code-1-field-0-card" },
          dp: 12000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT1-084",
          as: "dantemon-seven-code-1-field-1",
          top: { card: "BT1-084", as: "dantemon-seven-code-1-field-1-card" },
          dp: 15000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 1,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
