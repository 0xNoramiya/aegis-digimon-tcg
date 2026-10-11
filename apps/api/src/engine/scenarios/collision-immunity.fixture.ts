import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "collision-immunity",
  board: {
    "0": {
      hand: [
        { card: "BT16-102", as: "collision-immunity-0-hand-0-card", faceUp: false },
        { card: "BT17-077", as: "collision-immunity-0-hand-1-card", faceUp: false },
        { card: "BT1-009", as: "collision-immunity-0-hand-2-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-001", as: "collision-immunity-0-deck-0-card" },
        { card: "BT1-001", as: "collision-immunity-0-deck-1-card" },
        { card: "BT1-001", as: "collision-immunity-0-deck-2-card" },
        { card: "BT1-001", as: "collision-immunity-0-deck-3-card" },
        { card: "BT1-001", as: "collision-immunity-0-deck-4-card" },
        { card: "BT1-001", as: "collision-immunity-0-deck-5-card" },
        { card: "BT1-001", as: "collision-immunity-0-deck-6-card" },
        { card: "BT1-001", as: "collision-immunity-0-deck-7-card" },
        { card: "BT1-001", as: "collision-immunity-0-deck-8-card" },
        { card: "BT1-001", as: "collision-immunity-0-deck-9-card" },
        { card: "BT1-001", as: "collision-immunity-0-deck-10-card" },
        { card: "BT1-001", as: "collision-immunity-0-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-001", as: "collision-immunity-0-security-0-card" },
        { card: "BT1-001", as: "collision-immunity-0-security-1-card" },
        { card: "BT1-001", as: "collision-immunity-0-security-2-card" },
        { card: "BT1-001", as: "collision-immunity-0-security-3-card" },
        { card: "BT1-001", as: "collision-immunity-0-security-4-card" },
      ],
      battleArea: [
        {
          card: "EX13-020",
          as: "collision-immunity-0-field-0",
          top: { card: "EX13-020", as: "collision-immunity-0-field-0-card" },
          dp: 7000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "BT21-036", as: "collision-immunity-0-source-0-0-card" }],
        },
        {
          card: "BT1-009",
          as: "collision-immunity-0-field-1",
          top: { card: "BT1-009", as: "collision-immunity-0-field-1-card" },
          dp: 3000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: [
        { card: "BT1-012", as: "collision-immunity-1-hand-0-card", faceUp: false },
        { card: "BT1-009", as: "collision-immunity-1-hand-1-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-001", as: "collision-immunity-1-deck-0-card" },
        { card: "BT1-001", as: "collision-immunity-1-deck-1-card" },
        { card: "BT1-001", as: "collision-immunity-1-deck-2-card" },
        { card: "BT1-001", as: "collision-immunity-1-deck-3-card" },
        { card: "BT1-001", as: "collision-immunity-1-deck-4-card" },
        { card: "BT1-001", as: "collision-immunity-1-deck-5-card" },
        { card: "BT1-001", as: "collision-immunity-1-deck-6-card" },
        { card: "BT1-001", as: "collision-immunity-1-deck-7-card" },
        { card: "BT1-001", as: "collision-immunity-1-deck-8-card" },
        { card: "BT1-001", as: "collision-immunity-1-deck-9-card" },
        { card: "BT1-001", as: "collision-immunity-1-deck-10-card" },
        { card: "BT1-001", as: "collision-immunity-1-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-084", as: "collision-immunity-1-security-0-card" },
        { card: "BT1-001", as: "collision-immunity-1-security-1-card" },
        { card: "BT1-001", as: "collision-immunity-1-security-2-card" },
        { card: "BT1-001", as: "collision-immunity-1-security-3-card" },
        { card: "BT1-001", as: "collision-immunity-1-security-4-card" },
      ],
      battleArea: [
        {
          card: "EX13-064",
          as: "collision-immunity-1-field-0",
          top: { card: "EX13-064", as: "collision-immunity-1-field-0-card" },
          dp: 12000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "EX13-058",
          as: "collision-immunity-1-field-1",
          top: { card: "EX13-058", as: "collision-immunity-1-field-1-card" },
          dp: 7000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "BT1-009", as: "collision-immunity-1-source-1-0-card" }],
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
