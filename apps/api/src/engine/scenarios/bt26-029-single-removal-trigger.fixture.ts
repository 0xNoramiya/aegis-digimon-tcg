import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "bt26-029-single-removal-trigger",
  board: {
    "0": {
      hand: [{ card: "BT26-029", as: "bt26-029-holy-card" }],
      deck: [
        { card: "BT1-085", as: "bt26-029-deck-0-0-card" },
        { card: "BT1-085", as: "bt26-029-deck-0-1-card" },
        { card: "BT1-085", as: "bt26-029-deck-0-2-card" },
        { card: "BT1-085", as: "bt26-029-deck-0-3-card" },
        { card: "BT1-085", as: "bt26-029-deck-0-4-card" },
        { card: "BT1-085", as: "bt26-029-deck-0-5-card" },
        { card: "BT1-085", as: "bt26-029-deck-0-6-card" },
        { card: "BT1-085", as: "bt26-029-deck-0-7-card" },
        { card: "BT1-085", as: "bt26-029-deck-0-8-card" },
        { card: "BT1-085", as: "bt26-029-deck-0-9-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "bt26-029-egg-0-card" }],
      security: [
        { card: "BT1-085", as: "bt26-029-security-0-0-card" },
        { card: "BT1-085", as: "bt26-029-security-0-1-card" },
        { card: "BT1-085", as: "bt26-029-security-0-2-card" },
        { card: "BT1-085", as: "bt26-029-security-0-3-card" },
      ],
      battleArea: [
        {
          card: "BT15-084",
          as: "own-bt26-029-kari",
          top: { card: "BT15-084", as: "own-card-bt26-029-kari-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "bt26-029-deck-1-0-card" },
        { card: "BT1-085", as: "bt26-029-deck-1-1-card" },
        { card: "BT1-085", as: "bt26-029-deck-1-2-card" },
        { card: "BT1-085", as: "bt26-029-deck-1-3-card" },
        { card: "BT1-085", as: "bt26-029-deck-1-4-card" },
        { card: "BT1-085", as: "bt26-029-deck-1-5-card" },
        { card: "BT1-085", as: "bt26-029-deck-1-6-card" },
        { card: "BT1-085", as: "bt26-029-deck-1-7-card" },
        { card: "BT1-085", as: "bt26-029-deck-1-8-card" },
        { card: "BT1-085", as: "bt26-029-deck-1-9-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "bt26-029-egg-1-card" }],
      security: [
        { card: "BT1-085", as: "bt26-029-security-1-0-card" },
        { card: "BT1-085", as: "bt26-029-security-1-1-card" },
        { card: "BT1-085", as: "bt26-029-security-1-2-card" },
        { card: "BT1-085", as: "bt26-029-security-1-3-card" },
      ],
      battleArea: [
        {
          card: "BT1-009",
          as: "opponent-bt26-029-monodramon-0",
          top: { card: "BT1-009", as: "opponent-card-bt26-029-monodramon-0-card" },
          dp: 3000,
          placedByEffect: false,
        },
        {
          card: "BT1-009",
          as: "opponent-bt26-029-monodramon-1",
          top: { card: "BT1-009", as: "opponent-card-bt26-029-monodramon-1-card" },
          dp: 3000,
          placedByEffect: false,
        },
        {
          card: "BT1-009",
          as: "opponent-bt26-029-monodramon-2",
          top: { card: "BT1-009", as: "opponent-card-bt26-029-monodramon-2-card" },
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
