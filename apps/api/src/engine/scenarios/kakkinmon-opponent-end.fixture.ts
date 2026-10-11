import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "kakkinmon-opponent-end",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-0-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-1-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-2-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-3-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-4-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-5-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-6-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-7-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-8-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-9-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-10-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-0-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-001", as: "kakkinmon-opponent-end-0-security-0-card" },
        { card: "BT1-001", as: "kakkinmon-opponent-end-0-security-1-card" },
        { card: "BT1-001", as: "kakkinmon-opponent-end-0-security-2-card" },
        { card: "BT1-001", as: "kakkinmon-opponent-end-0-security-3-card" },
        { card: "BT1-001", as: "kakkinmon-opponent-end-0-security-4-card" },
      ],
      battleArea: [
        {
          card: "EX13-062",
          as: "kakkinmon-opponent-end-0-field-0",
          top: { card: "EX13-062", as: "kakkinmon-opponent-end-0-field-0-card" },
          dp: 12000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "P-245", as: "kakkinmon-opponent-end-0-source-0-0-card" }],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-0-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-1-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-2-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-3-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-4-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-5-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-6-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-7-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-8-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-9-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-10-card" },
        { card: "BT1-009", as: "kakkinmon-opponent-end-1-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-001", as: "kakkinmon-opponent-end-1-security-0-card" },
        { card: "BT1-001", as: "kakkinmon-opponent-end-1-security-1-card" },
        { card: "BT1-001", as: "kakkinmon-opponent-end-1-security-2-card" },
        { card: "BT1-001", as: "kakkinmon-opponent-end-1-security-3-card" },
        { card: "BT1-001", as: "kakkinmon-opponent-end-1-security-4-card" },
      ],
      battleArea: [
        {
          card: "BT1-009",
          as: "kakkinmon-opponent-end-1-field-0",
          top: { card: "BT1-009", as: "kakkinmon-opponent-end-1-field-0-card" },
          dp: 3000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT1-009",
          as: "kakkinmon-opponent-end-1-field-1",
          top: { card: "BT1-009", as: "kakkinmon-opponent-end-1-field-1-card" },
          dp: 3000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT1-084",
          as: "kakkinmon-opponent-end-1-field-2",
          top: { card: "BT1-084", as: "kakkinmon-opponent-end-1-field-2-card" },
          dp: 15000,
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
