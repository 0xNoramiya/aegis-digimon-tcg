import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "omnimon-gallantmon",
  board: {
    "0": {
      hand: [{ card: "AD1-025", as: "omnimon-gallantmon-0-hand-0-card", faceUp: false }],
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
          card: "EX12-035",
          as: "omnimon-gallantmon-0-field-0",
          top: { card: "EX12-035", as: "omnimon-gallantmon-0-field-0-card" },
          dp: 12000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [
            { card: "BT1-009", as: "omnimon-gallantmon-0-source-0-0-card" },
            { card: "BT1-009", as: "omnimon-gallantmon-0-source-0-1-card" },
            { card: "BT1-009", as: "omnimon-gallantmon-0-source-0-2-card" },
            { card: "BT1-009", as: "omnimon-gallantmon-0-source-0-3-card" },
            { card: "BT1-009", as: "omnimon-gallantmon-0-source-0-4-card" },
          ],
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
      battleArea: [
        {
          card: "EX13-015",
          as: "omnimon-gallantmon-1-field-0",
          top: { card: "EX13-015", as: "omnimon-gallantmon-1-field-0-card" },
          dp: 12000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [
            { card: "EX13-001", as: "omnimon-gallantmon-1-source-0-0-card" },
            { card: "EX2-008", as: "omnimon-gallantmon-1-source-0-1-card" },
            { card: "EX13-010", as: "omnimon-gallantmon-1-source-0-2-card" },
            { card: "EX8-012", as: "omnimon-gallantmon-1-source-0-3-card" },
            { card: "EX13-013", as: "omnimon-gallantmon-1-source-0-4-card" },
          ],
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
