import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "ruin-mode-on-play",
  board: {
    "0": {
      hand: [
        { card: "BT3-098", as: "delete-option-card" },
        { card: "BT1-070", as: "kuwagamon-card" },
        { card: "BT14-049", as: "lillymon-card" },
      ],
      deck: [
        { card: "BT1-085", as: "deck-0-0-card" },
        { card: "BT1-085", as: "deck-0-1-card" },
        { card: "BT1-085", as: "deck-0-2-card" },
        { card: "BT1-085", as: "deck-0-3-card" },
        { card: "BT1-085", as: "deck-0-4-card" },
        { card: "BT1-085", as: "deck-0-5-card" },
        { card: "BT1-085", as: "deck-0-6-card" },
        { card: "BT1-085", as: "deck-0-7-card" },
        { card: "BT1-085", as: "deck-0-8-card" },
        { card: "BT1-085", as: "deck-0-9-card" },
        { card: "BT1-085", as: "deck-0-10-card" },
        { card: "BT1-085", as: "deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-010", as: "security-0-0-card" },
        { card: "BT1-010", as: "security-0-1-card" },
        { card: "BT1-010", as: "security-0-2-card" },
        { card: "BT1-010", as: "security-0-3-card" },
      ],
      battleArea: [
        {
          card: "BT1-085",
          as: "own-tai",
          top: { card: "BT1-085", as: "own-card-tai-card" },
          dp: 0,
          placedByEffect: false,
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
        { card: "BT1-085", as: "deck-1-8-card" },
        { card: "BT1-085", as: "deck-1-9-card" },
        { card: "BT1-085", as: "deck-1-10-card" },
        { card: "BT1-085", as: "deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-010", as: "security-1-0-card" },
        { card: "BT1-010", as: "security-1-1-card" },
        { card: "BT1-010", as: "security-1-2-card" },
        { card: "BT1-010", as: "security-1-3-card" },
      ],
      battleArea: [
        {
          card: "EX4-074",
          as: "opponent-ruin-mode",
          top: { card: "EX4-074", as: "opponent-card-ruin-mode-card" },
          dp: 15000,
          placedByEffect: false,
        },
        {
          card: "BT1-009",
          as: "opponent-monodramon",
          top: { card: "BT1-009", as: "opponent-card-monodramon-card" },
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
