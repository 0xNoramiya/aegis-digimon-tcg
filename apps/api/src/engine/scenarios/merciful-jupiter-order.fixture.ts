import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "merciful-jupiter-order",
  board: {
    "0": {
      hand: [{ card: "EX13-077", as: "merciful-jupiter-order-0-hand-0-card", faceUp: false }],
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
          card: "AD1-001",
          as: "merciful-jupiter-order-0-field-0",
          top: { card: "AD1-001", as: "merciful-jupiter-order-0-field-0-card" },
          dp: 5000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "AD1-010",
          as: "merciful-jupiter-order-0-field-1",
          top: { card: "AD1-010", as: "merciful-jupiter-order-0-field-1-card" },
          dp: 5000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "AD1-014",
          as: "merciful-jupiter-order-0-field-2",
          top: { card: "AD1-014", as: "merciful-jupiter-order-0-field-2-card" },
          dp: 12000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "AD1-025",
          as: "merciful-jupiter-order-0-field-3",
          top: { card: "AD1-025", as: "merciful-jupiter-order-0-field-3-card" },
          dp: 15000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "ST20-05",
          as: "merciful-jupiter-order-0-field-4",
          top: { card: "ST20-05", as: "merciful-jupiter-order-0-field-4-card" },
          dp: 4000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "ST20-07",
          as: "merciful-jupiter-order-0-field-5",
          top: { card: "ST20-07", as: "merciful-jupiter-order-0-field-5-card" },
          dp: 3000,
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
        { card: "BT1-009", as: "merciful-jupiter-order-1-security-0-card" },
        { card: "BT1-009", as: "merciful-jupiter-order-1-security-1-card" },
        { card: "BT1-009", as: "merciful-jupiter-order-1-security-2-card" },
      ],
      battleArea: [
        {
          card: "BT26-103",
          as: "merciful-jupiter-order-1-field-0",
          top: { card: "BT26-103", as: "merciful-jupiter-order-1-field-0-card" },
          dp: 16000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "EX13-030", as: "merciful-jupiter-order-1-source-0-0-card" }],
        },
      ],
    },
  },
  memory: 20,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  allowOutOfRangeMemory: true,
};

export default fixture;
