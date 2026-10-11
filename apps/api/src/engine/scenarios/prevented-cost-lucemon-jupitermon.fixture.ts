import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "prevented-cost-lucemon-jupitermon",
  board: {
    "0": {
      deck: [
        { card: "BT1-085", as: "prevented-cost-deck-0-0-card" },
        { card: "BT1-085", as: "prevented-cost-deck-0-1-card" },
        { card: "BT1-085", as: "prevented-cost-deck-0-2-card" },
        { card: "BT1-085", as: "prevented-cost-deck-0-3-card" },
        { card: "BT1-085", as: "prevented-cost-deck-0-4-card" },
        { card: "BT1-085", as: "prevented-cost-deck-0-5-card" },
        { card: "BT1-085", as: "prevented-cost-deck-0-6-card" },
        { card: "BT1-085", as: "prevented-cost-deck-0-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "prevented-cost-egg-0-card" }],
      trash: [{ card: "BT18-082", as: "prevented-cost-chaos-mode-card" }],
      security: [
        { card: "BT1-085", as: "prevented-cost-security-0-0-card" },
        { card: "BT1-085", as: "prevented-cost-security-0-1-card" },
        { card: "BT1-085", as: "prevented-cost-security-0-2-card" },
      ],
      battleArea: [
        {
          card: "BT18-034",
          as: "own-prevented-cost-lucemon",
          top: { card: "BT18-034", as: "own-card-prevented-cost-lucemon-card" },
          dp: 10000,
          placedByEffect: false,
        },
        {
          card: "BT24-101",
          as: "own-prevented-cost-jupitermon",
          top: { card: "BT24-101", as: "own-card-prevented-cost-jupitermon-card" },
          dp: 13000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "prevented-cost-deck-1-0-card" },
        { card: "BT1-085", as: "prevented-cost-deck-1-1-card" },
        { card: "BT1-085", as: "prevented-cost-deck-1-2-card" },
        { card: "BT1-085", as: "prevented-cost-deck-1-3-card" },
        { card: "BT1-085", as: "prevented-cost-deck-1-4-card" },
        { card: "BT1-085", as: "prevented-cost-deck-1-5-card" },
        { card: "BT1-085", as: "prevented-cost-deck-1-6-card" },
        { card: "BT1-085", as: "prevented-cost-deck-1-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "prevented-cost-egg-1-card" }],
      security: [
        { card: "BT1-085", as: "prevented-cost-security-1-0-card" },
        { card: "BT1-085", as: "prevented-cost-security-1-1-card" },
        { card: "BT1-085", as: "prevented-cost-security-1-2-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
