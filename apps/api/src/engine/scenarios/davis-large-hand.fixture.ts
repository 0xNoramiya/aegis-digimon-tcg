import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "davis-large-hand",
  board: {
    "0": {
      hand: [
        { card: "BT1-010", as: "davis-large-hand-0-hand-0-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-1-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-2-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-3-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-4-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-5-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-6-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-7-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-8-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-9-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-10-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-11-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-12-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-13-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-14-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-15-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-16-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-17-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-18-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-19-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-20-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-21-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-22-card", faceUp: false },
        { card: "BT1-010", as: "davis-large-hand-0-hand-23-card", faceUp: false },
        { card: "BT3-021", as: "davis-large-hand-0-hand-24-card", faceUp: false },
        { card: "BT3-047", as: "davis-large-hand-0-hand-25-card", faceUp: false },
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
          card: "BT16-085",
          as: "davis-large-hand-0-field-0",
          top: { card: "BT16-085", as: "davis-large-hand-0-field-0-card" },
          dp: 0,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT1-038",
          as: "davis-large-hand-0-field-1",
          top: { card: "BT1-038", as: "davis-large-hand-0-field-1-card" },
          dp: 6000,
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
      security: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 3, 2, 1, 0] }),
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
