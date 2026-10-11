import type { ScenarioFixture } from "../scenario/types.js";
import { dealtCards } from "../scenario/dealtCards.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

const fixture: ScenarioFixture = {
  name: "ravemon-bottom-security",
  board: {
    "0": {
      hand: [{ card: "BT26-082", as: "ravemon-card", faceUp: false }],
      deck: [
        { card: "BT1-010", as: "deck-0-0-card" },
        { card: "BT1-010", as: "deck-0-1-card" },
        { card: "BT1-010", as: "deck-0-2-card" },
        { card: "BT1-010", as: "deck-0-3-card" },
        { card: "BT1-010", as: "deck-0-4-card" },
        { card: "BT1-010", as: "deck-0-5-card" },
        { card: "BT1-010", as: "deck-0-6-card" },
        { card: "BT1-010", as: "deck-0-7-card" },
        { card: "BT1-010", as: "deck-0-8-card" },
        { card: "BT1-010", as: "deck-0-9-card" },
        { card: "BT1-010", as: "deck-0-10-card" },
        { card: "BT1-010", as: "deck-0-11-card" },
        { card: "BT1-010", as: "deck-0-12-card" },
        { card: "BT1-010", as: "deck-0-13-card" },
        { card: "BT1-010", as: "deck-0-14-card" },
        { card: "BT1-010", as: "deck-0-15-card" },
        { card: "BT1-010", as: "deck-0-16-card" },
        { card: "BT1-010", as: "deck-0-17-card" },
        { card: "BT1-010", as: "deck-0-18-card" },
        { card: "BT1-010", as: "deck-0-19-card" },
      ],
      eggDeck: dealtCards({ deck: BLUE_DECK, seat: 0, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "security-top-0-card", faceUp: true },
        { card: "BT1-010", as: "security-hidden-0-card" },
      ],
      battleArea: [
        {
          card: "BT26-076",
          as: "own-crowmon",
          top: { card: "BT26-076", as: "own-card-crowmon-card" },
          dp: 7000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: [
        { card: "BT1-010", as: "discard-0-card", faceUp: false },
        { card: "BT1-010", as: "discard-1-card", faceUp: false },
        { card: "BT1-010", as: "discard-2-card", faceUp: false },
        { card: "BT1-010", as: "discard-3-card", faceUp: false },
        { card: "BT1-010", as: "discard-4-card", faceUp: false },
        { card: "BT1-010", as: "discard-5-card", faceUp: false },
        { card: "BT1-010", as: "discard-6-card", faceUp: false },
        { card: "BT1-010", as: "discard-7-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-010", as: "deck-1-0-card" },
        { card: "BT1-010", as: "deck-1-1-card" },
        { card: "BT1-010", as: "deck-1-2-card" },
        { card: "BT1-010", as: "deck-1-3-card" },
        { card: "BT1-010", as: "deck-1-4-card" },
        { card: "BT1-010", as: "deck-1-5-card" },
        { card: "BT1-010", as: "deck-1-6-card" },
        { card: "BT1-010", as: "deck-1-7-card" },
        { card: "BT1-010", as: "deck-1-8-card" },
        { card: "BT1-010", as: "deck-1-9-card" },
        { card: "BT1-010", as: "deck-1-10-card" },
        { card: "BT1-010", as: "deck-1-11-card" },
        { card: "BT1-010", as: "deck-1-12-card" },
        { card: "BT1-010", as: "deck-1-13-card" },
        { card: "BT1-010", as: "deck-1-14-card" },
        { card: "BT1-010", as: "deck-1-15-card" },
        { card: "BT1-010", as: "deck-1-16-card" },
        { card: "BT1-010", as: "deck-1-17-card" },
        { card: "BT1-010", as: "deck-1-18-card" },
        { card: "BT1-010", as: "deck-1-19-card" },
      ],
      eggDeck: dealtCards({ deck: RED_DECK, seat: 1, indices: [0, 1, 2, 3, 4], egg: true, aliasOffset: 50 }),
      security: [
        { card: "BT1-009", as: "security-top-1-card", faceUp: true },
        { card: "BT1-010", as: "security-hidden-1-card" },
      ],
      battleArea: [
        {
          card: "BT1-084",
          as: "opponent-highest",
          top: { card: "BT1-084", as: "opponent-card-highest-card" },
          dp: 15000,
          placedByEffect: false,
        },
        {
          card: "AD1-001",
          as: "opponent-attacker",
          top: { card: "AD1-001", as: "opponent-card-attacker-card" },
          dp: 5000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 6,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
