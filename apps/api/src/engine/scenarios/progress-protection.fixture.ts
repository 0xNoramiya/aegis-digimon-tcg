import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "progress-protection",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "progress-protection-0-deck-0-card" },
        { card: "BT1-009", as: "progress-protection-0-deck-1-card" },
        { card: "BT1-009", as: "progress-protection-0-deck-2-card" },
        { card: "BT1-009", as: "progress-protection-0-deck-3-card" },
        { card: "BT1-009", as: "progress-protection-0-deck-4-card" },
        { card: "BT1-009", as: "progress-protection-0-deck-5-card" },
        { card: "BT1-009", as: "progress-protection-0-deck-6-card" },
        { card: "BT1-009", as: "progress-protection-0-deck-7-card" },
        { card: "BT1-009", as: "progress-protection-0-deck-8-card" },
        { card: "BT1-009", as: "progress-protection-0-deck-9-card" },
        { card: "BT1-009", as: "progress-protection-0-deck-10-card" },
        { card: "BT1-009", as: "progress-protection-0-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "progress-protection-0-security-0-card" },
        { card: "BT1-009", as: "progress-protection-0-security-1-card" },
        { card: "BT1-009", as: "progress-protection-0-security-2-card" },
        { card: "BT1-009", as: "progress-protection-0-security-3-card" },
        { card: "BT1-009", as: "progress-protection-0-security-4-card" },
      ],
      battleArea: [
        {
          card: "P-189",
          as: "progress-protection-0-field-0",
          top: { card: "P-189", as: "progress-protection-0-field-0-card" },
          dp: 6000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT1-010",
          as: "progress-protection-0-field-1",
          top: { card: "BT1-010", as: "progress-protection-0-field-1-card" },
          dp: 2000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "progress-protection-1-deck-0-card" },
        { card: "BT1-009", as: "progress-protection-1-deck-1-card" },
        { card: "BT1-009", as: "progress-protection-1-deck-2-card" },
        { card: "BT1-009", as: "progress-protection-1-deck-3-card" },
        { card: "BT1-009", as: "progress-protection-1-deck-4-card" },
        { card: "BT1-009", as: "progress-protection-1-deck-5-card" },
        { card: "BT1-009", as: "progress-protection-1-deck-6-card" },
        { card: "BT1-009", as: "progress-protection-1-deck-7-card" },
        { card: "BT1-009", as: "progress-protection-1-deck-8-card" },
        { card: "BT1-009", as: "progress-protection-1-deck-9-card" },
        { card: "BT1-009", as: "progress-protection-1-deck-10-card" },
        { card: "BT1-009", as: "progress-protection-1-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "progress-protection-1-security-0-card" },
        { card: "BT1-009", as: "progress-protection-1-security-1-card" },
        { card: "BT1-009", as: "progress-protection-1-security-2-card" },
        { card: "BT1-009", as: "progress-protection-1-security-3-card" },
        { card: "BT1-009", as: "progress-protection-1-security-4-card" },
      ],
      battleArea: [
        {
          card: "BT10-070",
          as: "progress-protection-1-field-0",
          top: { card: "BT10-070", as: "progress-protection-1-field-0-card" },
          dp: 13000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "BT1-009", as: "progress-protection-1-source-0-0-card" }],
        },
      ],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
