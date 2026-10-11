import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "multiple-field-effects",
  board: {
    "0": {
      hand: [
        { card: "BT25-018", as: "multiple-field-effects-0-hand-0-card", faceUp: false },
        { card: "BT25-018", as: "multiple-field-effects-0-hand-1-card", faceUp: false },
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
          card: "BT25-017",
          as: "multiple-field-effects-0-field-0",
          top: { card: "BT25-017", as: "multiple-field-effects-0-field-0-card" },
          dp: 7000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "BT25-008", as: "multiple-field-effects-0-source-0-0-card" }],
        },
        {
          card: "BT25-017",
          as: "multiple-field-effects-0-field-1",
          top: { card: "BT25-017", as: "multiple-field-effects-0-field-1-card" },
          dp: 7000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "BT25-008", as: "multiple-field-effects-0-source-1-0-card" }],
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
        { card: "BT14-034", as: "multiple-field-effects-1-security-0-card" },
        { card: "BT1-009", as: "multiple-field-effects-1-security-1-card" },
        { card: "BT1-009", as: "multiple-field-effects-1-security-2-card" },
      ],
      battleArea: [
        {
          card: "BT25-103",
          as: "multiple-field-effects-1-field-0",
          top: { card: "BT25-103", as: "multiple-field-effects-1-field-0-card" },
          dp: 15000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT5-111",
          as: "multiple-field-effects-1-field-1",
          top: { card: "BT5-111", as: "multiple-field-effects-1-field-1-card" },
          dp: 15000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT17-078",
          as: "multiple-field-effects-1-field-2",
          top: { card: "BT17-078", as: "multiple-field-effects-1-field-2-card" },
          dp: 15000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT5-111",
          as: "multiple-field-effects-1-field-3",
          top: { card: "BT5-111", as: "multiple-field-effects-1-field-3-card" },
          dp: 15000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT13-112",
          as: "multiple-field-effects-1-field-4",
          top: { card: "BT13-112", as: "multiple-field-effects-1-field-4-card" },
          dp: 14000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT1-085",
          as: "multiple-field-effects-1-field-5",
          top: { card: "BT1-085", as: "multiple-field-effects-1-field-5-card" },
          dp: 0,
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
