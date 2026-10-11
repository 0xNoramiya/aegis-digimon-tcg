import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "homeros-unused",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "eot-deck-0-0-card" },
        { card: "BT1-009", as: "eot-deck-0-1-card" },
        { card: "BT1-009", as: "eot-deck-0-2-card" },
        { card: "BT1-009", as: "eot-deck-0-3-card" },
        { card: "BT1-009", as: "eot-deck-0-4-card" },
        { card: "BT1-009", as: "eot-deck-0-5-card" },
        { card: "BT1-009", as: "eot-deck-0-6-card" },
        { card: "BT1-009", as: "eot-deck-0-7-card" },
        { card: "BT1-009", as: "eot-deck-0-8-card" },
        { card: "BT1-009", as: "eot-deck-0-9-card" },
        { card: "BT1-009", as: "eot-deck-0-10-card" },
        { card: "BT1-009", as: "eot-deck-0-11-card" },
        { card: "BT1-009", as: "eot-deck-0-12-card" },
        { card: "BT1-009", as: "eot-deck-0-13-card" },
        { card: "BT1-009", as: "eot-deck-0-14-card" },
        { card: "BT1-009", as: "eot-deck-0-15-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "eot-egg-0-card" }],
      security: [
        { card: "BT1-009", as: "eot-security-0-0-card" },
        { card: "BT1-009", as: "eot-security-0-1-card" },
      ],
      battleArea: [
        {
          card: "BT24-102",
          as: "own-eot-homeros",
          top: { card: "BT24-102", as: "own-card-eot-homeros-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT26-103",
          as: "own-eot-olympos",
          top: { card: "BT26-103", as: "own-card-eot-olympos-card" },
          dp: 16000,
          placedByEffect: false,
          under: [{ card: "BT25-044", as: "own-source-eot-olympos-0-card" }],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "eot-deck-1-0-card" },
        { card: "BT1-009", as: "eot-deck-1-1-card" },
        { card: "BT1-009", as: "eot-deck-1-2-card" },
        { card: "BT1-009", as: "eot-deck-1-3-card" },
        { card: "BT1-009", as: "eot-deck-1-4-card" },
        { card: "BT1-009", as: "eot-deck-1-5-card" },
        { card: "BT1-009", as: "eot-deck-1-6-card" },
        { card: "BT1-009", as: "eot-deck-1-7-card" },
        { card: "BT1-009", as: "eot-deck-1-8-card" },
        { card: "BT1-009", as: "eot-deck-1-9-card" },
        { card: "BT1-009", as: "eot-deck-1-10-card" },
        { card: "BT1-009", as: "eot-deck-1-11-card" },
        { card: "BT1-009", as: "eot-deck-1-12-card" },
        { card: "BT1-009", as: "eot-deck-1-13-card" },
        { card: "BT1-009", as: "eot-deck-1-14-card" },
        { card: "BT1-009", as: "eot-deck-1-15-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "eot-egg-1-card" }],
      security: [
        { card: "BT1-009", as: "eot-security-1-0-card" },
        { card: "BT1-009", as: "eot-security-1-1-card" },
      ],
    },
  },
  memory: 0,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
