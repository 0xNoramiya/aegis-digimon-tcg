import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "growlmon-deletion",
  board: {
    "0": {
      hand: [
        { card: "EX8-012", as: "xgrowlmon-card" },
        { card: "BT1-010", as: "discard-card" },
      ],
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
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-084", as: "security-0-0-card" },
        { card: "BT1-084", as: "security-0-1-card" },
        { card: "BT1-084", as: "security-0-2-card" },
      ],
      battleArea: [
        {
          card: "BT2-013",
          as: "own-growlmon",
          top: { card: "BT2-013", as: "own-card-growlmon-card" },
          dp: 4000,
          placedByEffect: false,
          under: [{ card: "EX8-009", as: "own-source-growlmon-0-card" }],
        },
      ],
    },
    "1": {
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
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-084", as: "security-1-0-card" },
        { card: "BT1-084", as: "security-1-1-card" },
        { card: "BT1-084", as: "security-1-2-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
