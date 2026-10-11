import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "kaguyamon-empty-deck",
  board: {
    "0": {
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
        { card: "BT1-010", as: "security-0-0-card" },
        { card: "BT1-010", as: "security-0-1-card" },
        { card: "BT1-010", as: "security-0-2-card" },
        { card: "BT1-010", as: "security-0-3-card" },
      ],
      battleArea: [
        {
          card: "EX12-065",
          as: "own-kaguyamon",
          top: { card: "EX12-065", as: "own-card-kaguyamon-card" },
          dp: 12000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-010", as: "security-1-0-card" },
        { card: "BT1-010", as: "security-1-1-card" },
        { card: "BT1-010", as: "security-1-2-card" },
        { card: "BT1-010", as: "security-1-3-card" },
      ],
      battleArea: [
        {
          card: "EX13-063",
          as: "opponent-princemamemon",
          top: { card: "EX13-063", as: "opponent-card-princemamemon-card" },
          dp: 12000,
          placedByEffect: false,
          suspended: true,
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
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
