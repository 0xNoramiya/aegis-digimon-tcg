import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "gammamon-exact-evolution",
  board: {
    "0": {
      hand: [
        { card: "BT21-022", as: "gammamon-exact-evolution-0-hand-0-card", faceUp: false },
        { card: "BT21-010", as: "gammamon-exact-evolution-0-hand-1-card", faceUp: false },
        { card: "RB1-009", as: "gammamon-exact-evolution-0-hand-2-card", faceUp: false },
        { card: "EX10-042", as: "gammamon-exact-evolution-0-hand-3-card", faceUp: false },
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
          card: "BT21-019",
          as: "gammamon-exact-evolution-0-field-0",
          top: { card: "BT21-019", as: "gammamon-exact-evolution-0-field-0-card" },
          dp: 6000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [
            { card: "RB1-001", as: "gammamon-exact-evolution-0-source-0-0-card" },
            { card: "BT21-010", as: "gammamon-exact-evolution-0-source-0-1-card" },
          ],
        },
        {
          card: "BT21-090",
          as: "gammamon-exact-evolution-0-field-1",
          top: { card: "BT21-090", as: "gammamon-exact-evolution-0-field-1-card" },
          dp: 0,
          enterFieldTurnCount: -1,
          placedByEffect: true,
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
        { card: "BT1-009", as: "gammamon-exact-evolution-1-security-0-card" },
        { card: "BT1-009", as: "gammamon-exact-evolution-1-security-1-card" },
        { card: "BT1-009", as: "gammamon-exact-evolution-1-security-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-009",
          as: "gammamon-exact-evolution-1-field-0",
          top: { card: "BT1-009", as: "gammamon-exact-evolution-1-field-0-card" },
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
