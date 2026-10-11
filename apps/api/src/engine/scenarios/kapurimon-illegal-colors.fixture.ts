import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "kapurimon-illegal-colors",
  board: {
    "0": {
      hand: [{ card: "EX12-035", as: "kapurimon-illegal-colors-0-hand-0-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-0-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-1-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-2-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-3-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-4-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-5-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-6-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-7-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-8-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-9-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-10-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-0-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [4, 3, 2, 1, 0] }),
      battleArea: [
        {
          card: "EX12-016",
          as: "kapurimon-illegal-colors-0-field-0",
          top: { card: "EX12-016", as: "kapurimon-illegal-colors-0-field-0-card" },
          dp: 7000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "EX12-053", as: "kapurimon-illegal-colors-0-source-0-0-card" }],
        },
        {
          card: "EX9-018",
          as: "kapurimon-illegal-colors-0-field-1",
          top: { card: "EX9-018", as: "kapurimon-illegal-colors-0-field-1-card" },
          dp: 7000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "EX12-008",
          as: "kapurimon-illegal-colors-0-field-2",
          top: { card: "EX12-008", as: "kapurimon-illegal-colors-0-field-2-card" },
          dp: 2000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          under: [{ card: "EX12-003", as: "kapurimon-illegal-colors-0-source-2-0-card" }],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-0-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-1-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-2-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-3-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-4-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-5-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-6-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-7-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-8-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-9-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-10-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-security-0-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-security-1-card" },
        { card: "BT1-009", as: "kapurimon-illegal-colors-1-security-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-084",
          as: "kapurimon-illegal-colors-1-field-0",
          top: { card: "BT1-084", as: "kapurimon-illegal-colors-1-field-0-card" },
          dp: 15000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
          suspended: true,
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
