import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "burst-tamer-choice",
  board: {
    "0": {
      hand: [{ card: "BT13-020", as: "burst-mode-card", faceUp: false }],
      deck: [
        { card: "BT1-085", as: "deck-0-0-card" },
        { card: "BT1-085", as: "deck-0-1-card" },
        { card: "BT1-085", as: "deck-0-2-card" },
        { card: "BT1-085", as: "deck-0-3-card" },
        { card: "BT1-085", as: "deck-0-4-card" },
        { card: "BT1-085", as: "deck-0-5-card" },
        { card: "BT1-085", as: "deck-0-6-card" },
        { card: "BT1-085", as: "deck-0-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-085", as: "security-0-0-card" },
        { card: "BT1-085", as: "security-0-1-card" },
        { card: "BT1-085", as: "security-0-2-card" },
      ],
      battleArea: [
        {
          card: "ST7-10",
          as: "own-shinegreymon",
          top: { card: "ST7-10", as: "own-card-shinegreymon-card" },
          dp: 12000,
          placedByEffect: false,
        },
        {
          card: "BT4-092",
          as: "own-marcus-ready",
          top: { card: "BT4-092", as: "own-card-marcus-ready-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT17-087",
          as: "own-marcus-suspended",
          top: { card: "BT17-087", as: "own-card-marcus-suspended-card" },
          dp: 0,
          placedByEffect: false,
          suspended: true,
          under: [{ card: "BT1-085", as: "own-source-marcus-suspended-0-card", faceUp: false }],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "deck-1-0-card" },
        { card: "BT1-085", as: "deck-1-1-card" },
        { card: "BT1-085", as: "deck-1-2-card" },
        { card: "BT1-085", as: "deck-1-3-card" },
        { card: "BT1-085", as: "deck-1-4-card" },
        { card: "BT1-085", as: "deck-1-5-card" },
        { card: "BT1-085", as: "deck-1-6-card" },
        { card: "BT1-085", as: "deck-1-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-085", as: "security-1-0-card" },
        { card: "BT1-085", as: "security-1-1-card" },
        { card: "BT1-085", as: "security-1-2-card" },
      ],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
