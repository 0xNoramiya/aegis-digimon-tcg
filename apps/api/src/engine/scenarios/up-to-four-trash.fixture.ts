import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "up-to-four-trash",
  board: {
    "0": {
      hand: [{ card: "EX10-013", as: "up-to-four-trash-0-hand-0-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "up-to-four-trash-0-deck-0-card" },
        { card: "BT1-009", as: "up-to-four-trash-0-deck-1-card" },
        { card: "BT1-009", as: "up-to-four-trash-0-deck-2-card" },
        { card: "BT1-009", as: "up-to-four-trash-0-deck-3-card" },
        { card: "BT1-009", as: "up-to-four-trash-0-deck-4-card" },
        { card: "BT1-009", as: "up-to-four-trash-0-deck-5-card" },
        { card: "BT1-009", as: "up-to-four-trash-0-deck-6-card" },
        { card: "BT1-009", as: "up-to-four-trash-0-deck-7-card" },
        { card: "BT1-009", as: "up-to-four-trash-0-deck-8-card" },
        { card: "BT1-009", as: "up-to-four-trash-0-deck-9-card" },
        { card: "BT1-009", as: "up-to-four-trash-0-deck-10-card" },
        { card: "BT1-009", as: "up-to-four-trash-0-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      trash: [
        { card: "EX5-009", as: "up-to-four-trash-0-trash-0-card" },
        { card: "EX5-010", as: "up-to-four-trash-0-trash-1-card" },
        { card: "EX5-011", as: "up-to-four-trash-0-trash-2-card" },
        { card: "EX5-019", as: "up-to-four-trash-0-trash-3-card" },
      ],
      security: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [4, 3, 2, 1, 0] }),
      battleArea: [
        {
          card: "EX5-074",
          as: "up-to-four-trash-0-field-0",
          top: { card: "EX5-074", as: "up-to-four-trash-0-field-0-card" },
          dp: 15000,
          enterFieldTurnCount: -1,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "up-to-four-trash-1-deck-0-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-deck-1-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-deck-2-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-deck-3-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-deck-4-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-deck-5-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-deck-6-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-deck-7-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-deck-8-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-deck-9-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-deck-10-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-deck-11-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "up-to-four-trash-1-security-0-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-security-1-card" },
        { card: "BT1-009", as: "up-to-four-trash-1-security-2-card" },
      ],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
