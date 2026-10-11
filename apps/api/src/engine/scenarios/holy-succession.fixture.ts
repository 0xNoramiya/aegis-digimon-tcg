import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "holy-succession",
  board: {
    "0": {
      hand: [{ card: "BT26-085", as: "holy-succession-0-hand-0-card", faceUp: false }],
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
        { card: "BT26-078", as: "holy-succession-0-trash-0-card" },
        { card: "BT26-060", as: "holy-succession-0-trash-1-card" },
        { card: "BT26-001", as: "holy-succession-0-trash-2-card" },
        { card: "BT26-009", as: "holy-succession-0-trash-3-card" },
        { card: "BT26-011", as: "holy-succession-0-trash-4-card" },
        { card: "BT26-015", as: "holy-succession-0-trash-5-card" },
        { card: "BT26-016", as: "holy-succession-0-trash-6-card" },
      ],
      security: [
        { card: "BT1-009", as: "holy-succession-0-security-0-card" },
        { card: "BT1-009", as: "holy-succession-0-security-1-card" },
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
        { card: "BT1-009", as: "holy-succession-1-security-0-card" },
        { card: "BT1-009", as: "holy-succession-1-security-1-card" },
        { card: "BT1-009", as: "holy-succession-1-security-2-card" },
      ],
    },
  },
  memory: 2,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
