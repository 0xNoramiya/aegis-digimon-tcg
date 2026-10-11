import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "lavorvomon-search",
  board: {
    "0": {
      hand: [{ card: "EX3-007", as: "open-bugs-lavorvomon-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "open-bugs-reveal-0-card" },
        { card: "EX3-011", as: "open-bugs-reveal-1-card" },
        { card: "EX3-065", as: "open-bugs-reveal-2-card" },
        { card: "BT1-009", as: "open-bugs-reveal-3-card" },
        { card: "BT1-013", as: "open-bugs-reveal-4-card" },
        { card: "BT1-014", as: "open-bugs-reveal-5-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "open-bugs-security-0-0-card" },
        { card: "BT1-009", as: "open-bugs-security-0-1-card" },
        { card: "BT1-009", as: "open-bugs-security-0-2-card" },
        { card: "BT1-009", as: "open-bugs-security-0-3-card" },
        { card: "BT1-009", as: "open-bugs-security-0-4-card" },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "open-bugs-deck-1-0-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-1-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-2-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-3-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-4-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-5-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-6-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-7-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-8-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-9-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-10-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-11-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-12-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-13-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-14-card" },
        { card: "BT1-009", as: "open-bugs-deck-1-15-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [4, 2, 3, 0, 1], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "open-bugs-security-1-0-card" },
        { card: "BT1-009", as: "open-bugs-security-1-1-card" },
        { card: "BT1-009", as: "open-bugs-security-1-2-card" },
        { card: "BT1-009", as: "open-bugs-security-1-3-card" },
        { card: "BT1-009", as: "open-bugs-security-1-4-card" },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
