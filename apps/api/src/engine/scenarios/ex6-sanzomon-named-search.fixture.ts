import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "ex6-sanzomon-named-search",
  board: {
    "0": {
      hand: [
        { card: "EX6-025", as: "sanzo-hand-0-card", faceUp: false },
        { card: "EX6-023", as: "sanzo-hand-1-card", faceUp: false },
        { card: "EX6-024", as: "sanzo-hand-2-card", faceUp: false },
        { card: "EX6-026", as: "sanzo-hand-3-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-011", as: "sanzo-deck-0-card" },
        { card: "EX6-023", as: "sanzo-deck-1-card" },
        { card: "EX6-023", as: "sanzo-deck-2-card" },
        { card: "EX6-024", as: "sanzo-deck-3-card" },
        { card: "BT1-009", as: "sanzo-deck-4-card" },
        { card: "BT1-010", as: "sanzo-deck-5-card" },
      ],
      eggDeck: [{ card: "BT6-005", as: "sanzo-0-egg-card" }],
      security: [
        { card: "BT1-009", as: "sanzo-0-security-0-card" },
        { card: "BT1-009", as: "sanzo-0-security-1-card" },
        { card: "BT1-009", as: "sanzo-0-security-2-card" },
        { card: "BT1-009", as: "sanzo-0-security-3-card" },
        { card: "BT1-009", as: "sanzo-0-security-4-card" },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "sanzo-opponent-deck-0-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-1-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-2-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-3-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-4-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-5-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-6-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-7-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-8-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-9-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-10-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-11-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-12-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-13-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-14-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-15-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-16-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-17-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-18-card" },
        { card: "BT1-009", as: "sanzo-opponent-deck-19-card" },
      ],
      eggDeck: [{ card: "BT6-005", as: "sanzo-1-egg-card" }],
      security: [
        { card: "BT1-009", as: "sanzo-1-security-0-card" },
        { card: "BT1-009", as: "sanzo-1-security-1-card" },
        { card: "BT1-009", as: "sanzo-1-security-2-card" },
        { card: "BT1-009", as: "sanzo-1-security-3-card" },
        { card: "BT1-009", as: "sanzo-1-security-4-card" },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
