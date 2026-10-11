import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "kongou-prevention",
  board: {
    "0": {
      deck: dealtCards({
        deck: BLUE_DECK,
        seat: 0,
        indices: [
          5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
          34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
        ],
      }),
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [{ card: "EX10-057", as: "kongou-prevention-0-security-0-card", faceUp: true }],
      battleArea: [
        {
          card: "BT1-009",
          as: "kongou-prevention-0-field-0",
          top: { card: "BT1-009", as: "kongou-prevention-0-field-0-card" },
          dp: 3000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "EX10-020",
          as: "kongou-prevention-0-field-1",
          top: { card: "EX10-020", as: "kongou-prevention-0-field-1-card" },
          dp: 11000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "EX10-035",
          as: "kongou-prevention-0-field-2",
          top: { card: "EX10-035", as: "kongou-prevention-0-field-2-card" },
          dp: 11000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
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
        { card: "BT9-103", as: "kongou-prevention-1-security-0-card" },
        { card: "EX13-035", as: "kongou-prevention-1-security-1-card" },
        { card: "EX13-035", as: "kongou-prevention-1-security-2-card" },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
