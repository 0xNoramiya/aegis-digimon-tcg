import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "bt22-101-kyoko-alphamon-on-unsuspend",
  board: {
    "0": {
      hand: [{ card: "BT22-063", as: "bt22-101-alphamon-card" }],
      deck: [
        { card: "BT1-085", as: "bt22-101-deck-0-0-card" },
        { card: "BT1-085", as: "bt22-101-deck-0-1-card" },
        { card: "BT1-085", as: "bt22-101-deck-0-2-card" },
        { card: "BT1-085", as: "bt22-101-deck-0-3-card" },
        { card: "BT1-085", as: "bt22-101-deck-0-4-card" },
        { card: "BT1-085", as: "bt22-101-deck-0-5-card" },
        { card: "BT1-085", as: "bt22-101-deck-0-6-card" },
        { card: "BT1-085", as: "bt22-101-deck-0-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "bt22-101-egg-0-card" }],
      security: [
        { card: "BT1-085", as: "bt22-101-security-0-0-card" },
        { card: "BT1-085", as: "bt22-101-security-0-1-card" },
        { card: "BT1-085", as: "bt22-101-security-0-2-card" },
      ],
      battleArea: [
        {
          card: "BT22-101",
          as: "own-bt22-101-kyoko",
          top: { card: "BT22-101", as: "own-card-bt22-101-kyoko-card" },
          dp: 0,
          placedByEffect: false,
          suspended: true,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "bt22-101-deck-1-0-card" },
        { card: "BT1-085", as: "bt22-101-deck-1-1-card" },
        { card: "BT1-085", as: "bt22-101-deck-1-2-card" },
        { card: "BT1-085", as: "bt22-101-deck-1-3-card" },
        { card: "BT1-085", as: "bt22-101-deck-1-4-card" },
        { card: "BT1-085", as: "bt22-101-deck-1-5-card" },
        { card: "BT1-085", as: "bt22-101-deck-1-6-card" },
        { card: "BT1-085", as: "bt22-101-deck-1-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "bt22-101-egg-1-card" }],
      security: [
        { card: "BT1-085", as: "bt22-101-security-1-0-card" },
        { card: "BT1-085", as: "bt22-101-security-1-1-card" },
        { card: "BT1-085", as: "bt22-101-security-1-2-card" },
      ],
    },
  },
  memory: 4,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
