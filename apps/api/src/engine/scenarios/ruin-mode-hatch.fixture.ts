import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "ruin-mode-hatch",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-0-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-1-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-2-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-3-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-4-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-5-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-6-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-7-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-8-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-9-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-10-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-deck-11-card" },
      ],
      eggDeck: [{ card: "BT1-006", as: "ruin-mode-hatch-0-egg-0-card" }],
      security: [
        { card: "BT1-009", as: "ruin-mode-hatch-0-security-0-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-security-1-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-0-security-2-card" },
      ],
      battleArea: [
        {
          card: "EX4-074",
          as: "ruin-mode-hatch-0-field-0",
          top: { card: "EX4-074", as: "ruin-mode-hatch-0-field-0-card" },
          dp: 15000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
        {
          card: "BT1-085",
          as: "ruin-mode-hatch-0-field-1",
          top: { card: "BT1-085", as: "ruin-mode-hatch-0-field-1-card" },
          dp: 0,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-0-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-1-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-2-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-3-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-4-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-5-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-6-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-7-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-8-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-9-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-10-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "ruin-mode-hatch-1-security-0-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-security-1-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-security-2-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-security-3-card" },
        { card: "BT1-009", as: "ruin-mode-hatch-1-security-4-card" },
      ],
      battleArea: [
        {
          card: "BT1-013",
          as: "ruin-mode-hatch-1-field-0",
          top: { card: "BT1-013", as: "ruin-mode-hatch-1-field-0-card" },
          dp: 5000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
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
