import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "plugin-high-speed-optional-link",
  board: {
    "0": {
      hand: [
        { card: "ST22-09", as: "plugin-h-option-0-card" },
        { card: "ST22-09", as: "plugin-h-option-1-card" },
      ],
      deck: [
        { card: "BT1-085", as: "plugin-h-deck-0-0-card" },
        { card: "BT1-085", as: "plugin-h-deck-0-1-card" },
        { card: "BT1-085", as: "plugin-h-deck-0-2-card" },
        { card: "BT1-085", as: "plugin-h-deck-0-3-card" },
        { card: "BT1-085", as: "plugin-h-deck-0-4-card" },
        { card: "BT1-085", as: "plugin-h-deck-0-5-card" },
        { card: "BT1-085", as: "plugin-h-deck-0-6-card" },
        { card: "BT1-085", as: "plugin-h-deck-0-7-card" },
        { card: "BT1-085", as: "plugin-h-deck-0-8-card" },
        { card: "BT1-085", as: "plugin-h-deck-0-9-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "plugin-h-egg-0-card" }],
      security: [
        { card: "BT1-085", as: "plugin-h-security-0-0-card" },
        { card: "BT1-085", as: "plugin-h-security-0-1-card" },
        { card: "BT1-085", as: "plugin-h-security-0-2-card" },
        { card: "BT1-085", as: "plugin-h-security-0-3-card" },
        { card: "BT1-085", as: "plugin-h-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT1-010",
          as: "own-plugin-h-agumon",
          top: { card: "BT1-010", as: "own-card-plugin-h-agumon-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-085",
          as: "own-plugin-h-tai",
          top: { card: "BT1-085", as: "own-card-plugin-h-tai-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "plugin-h-deck-1-0-card" },
        { card: "BT1-085", as: "plugin-h-deck-1-1-card" },
        { card: "BT1-085", as: "plugin-h-deck-1-2-card" },
        { card: "BT1-085", as: "plugin-h-deck-1-3-card" },
        { card: "BT1-085", as: "plugin-h-deck-1-4-card" },
        { card: "BT1-085", as: "plugin-h-deck-1-5-card" },
        { card: "BT1-085", as: "plugin-h-deck-1-6-card" },
        { card: "BT1-085", as: "plugin-h-deck-1-7-card" },
        { card: "BT1-085", as: "plugin-h-deck-1-8-card" },
        { card: "BT1-085", as: "plugin-h-deck-1-9-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "plugin-h-egg-1-card" }],
      security: [
        { card: "BT1-085", as: "plugin-h-security-1-0-card" },
        { card: "BT1-085", as: "plugin-h-security-1-1-card" },
        { card: "BT1-085", as: "plugin-h-security-1-2-card" },
        { card: "BT1-085", as: "plugin-h-security-1-3-card" },
        { card: "BT1-085", as: "plugin-h-security-1-4-card" },
      ],
      battleArea: [
        {
          card: "BT1-009",
          as: "opponent-plugin-h-monodramon",
          top: { card: "BT1-009", as: "opponent-card-plugin-h-monodramon-card" },
          dp: 3000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 7,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
