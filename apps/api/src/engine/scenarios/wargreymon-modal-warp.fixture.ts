import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "wargreymon-modal-warp",
  board: {
    "0": {
      hand: [{ card: "BT22-013", as: "wargreymon-modal-warp-0-hand-0-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "wargreymon-modal-warp-0-deck-0-card" },
        { card: "BT1-009", as: "wargreymon-modal-warp-0-deck-1-card" },
        { card: "BT1-009", as: "wargreymon-modal-warp-0-deck-2-card" },
        { card: "BT1-009", as: "wargreymon-modal-warp-0-deck-3-card" },
        { card: "BT1-009", as: "wargreymon-modal-warp-0-deck-4-card" },
        { card: "BT1-009", as: "wargreymon-modal-warp-0-deck-5-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [4, 3, 2, 1, 0] }),
      battleArea: [
        {
          card: "BT1-010",
          as: "wargreymon-modal-warp-0-field-0",
          top: { card: "BT1-010", as: "wargreymon-modal-warp-0-field-0-card" },
          dp: 2000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT5-092",
          as: "wargreymon-modal-warp-0-field-1",
          top: { card: "BT5-092", as: "wargreymon-modal-warp-0-field-1-card" },
          dp: 0,
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
        { card: "BT1-009", as: "wargreymon-modal-warp-1-security-0-card" },
        { card: "BT1-009", as: "wargreymon-modal-warp-1-security-1-card" },
      ],
      battleArea: [
        {
          card: "BT1-010",
          as: "wargreymon-modal-warp-1-field-0",
          top: { card: "BT1-010", as: "wargreymon-modal-warp-1-field-0-card" },
          dp: 2000,
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
