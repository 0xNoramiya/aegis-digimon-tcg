import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "ignitemon-by-cost-optional",
  board: {
    "0": {
      deck: [
        { card: "BT1-085", as: "ignitemon-deck-0-0-card" },
        { card: "BT1-085", as: "ignitemon-deck-0-1-card" },
        { card: "BT1-085", as: "ignitemon-deck-0-2-card" },
        { card: "BT1-085", as: "ignitemon-deck-0-3-card" },
        { card: "BT1-085", as: "ignitemon-deck-0-4-card" },
        { card: "BT1-085", as: "ignitemon-deck-0-5-card" },
        { card: "BT1-085", as: "ignitemon-deck-0-6-card" },
        { card: "BT1-085", as: "ignitemon-deck-0-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "ignitemon-egg-0-card" }],
      security: [
        { card: "BT1-009", as: "ignitemon-security-0-0-card" },
        { card: "BT1-009", as: "ignitemon-security-0-1-card" },
        { card: "BT1-009", as: "ignitemon-security-0-2-card" },
      ],
      battleArea: [
        {
          card: "BT11-076",
          as: "own-ignitemon",
          top: { card: "BT11-076", as: "own-card-ignitemon-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "BT1-009",
          as: "own-ignitemon-monodramon",
          top: { card: "BT1-009", as: "own-card-ignitemon-monodramon-card" },
          dp: 3000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "ignitemon-deck-1-0-card" },
        { card: "BT1-085", as: "ignitemon-deck-1-1-card" },
        { card: "BT1-085", as: "ignitemon-deck-1-2-card" },
        { card: "BT1-085", as: "ignitemon-deck-1-3-card" },
        { card: "BT1-085", as: "ignitemon-deck-1-4-card" },
        { card: "BT1-085", as: "ignitemon-deck-1-5-card" },
        { card: "BT1-085", as: "ignitemon-deck-1-6-card" },
        { card: "BT1-085", as: "ignitemon-deck-1-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "ignitemon-egg-1-card" }],
      security: [
        { card: "BT1-009", as: "ignitemon-security-1-0-card" },
        { card: "BT1-009", as: "ignitemon-security-1-1-card" },
        { card: "BT1-009", as: "ignitemon-security-1-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-010",
          as: "opponent-ignitemon-agumon",
          top: { card: "BT1-010", as: "opponent-card-ignitemon-agumon-card" },
          dp: 2000,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
