import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "security-leak-known-card-face-down",
  board: {
    "0": {
      hand: [{ card: "BT10-101", as: "security-leak-adistakto-card", faceUp: false }],
      deck: [
        { card: "BT1-085", as: "security-leak-deck-0-0-card" },
        { card: "BT1-085", as: "security-leak-deck-0-1-card" },
        { card: "BT1-085", as: "security-leak-deck-0-2-card" },
        { card: "BT1-085", as: "security-leak-deck-0-3-card" },
        { card: "BT1-085", as: "security-leak-deck-0-4-card" },
        { card: "BT1-085", as: "security-leak-deck-0-5-card" },
        { card: "BT1-085", as: "security-leak-deck-0-6-card" },
        { card: "BT1-085", as: "security-leak-deck-0-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "security-leak-egg-0-card" }],
      security: [
        { card: "BT1-085", as: "security-leak-security-0-0-card" },
        { card: "BT1-085", as: "security-leak-security-0-1-card" },
      ],
      battleArea: [
        {
          card: "BT1-050",
          as: "own-security-leak-liollmon",
          top: { card: "BT1-050", as: "own-card-security-leak-liollmon-card" },
          dp: 4000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "security-leak-deck-1-0-card" },
        { card: "BT1-085", as: "security-leak-deck-1-1-card" },
        { card: "BT1-085", as: "security-leak-deck-1-2-card" },
        { card: "BT1-085", as: "security-leak-deck-1-3-card" },
        { card: "BT1-085", as: "security-leak-deck-1-4-card" },
        { card: "BT1-085", as: "security-leak-deck-1-5-card" },
        { card: "BT1-085", as: "security-leak-deck-1-6-card" },
        { card: "BT1-085", as: "security-leak-deck-1-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "security-leak-egg-1-card" }],
      security: [
        { card: "BT1-085", as: "security-leak-security-1-0-card" },
        { card: "BT1-010", as: "security-leak-security-1-face-up-card", faceUp: true },
        { card: "BT1-085", as: "security-leak-security-1-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-009",
          as: "opponent-security-leak-monodramon",
          top: { card: "BT1-009", as: "opponent-card-security-leak-monodramon-card" },
          dp: 3000,
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
