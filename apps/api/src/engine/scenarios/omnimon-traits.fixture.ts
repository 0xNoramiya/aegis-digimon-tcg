import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "omnimon-traits",
  board: {
    "0": {
      hand: [
        { card: "BT9-092", as: "cool-boy-card", faceUp: false },
        { card: "BT20-102", as: "evolution-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-009", as: "search-0-card" },
        { card: "BT20-102", as: "search-1-card" },
        { card: "BT5-086", as: "search-2-card" },
        { card: "BT1-009", as: "search-3-card" },
        { card: "BT1-009", as: "search-4-card" },
        { card: "BT1-009", as: "search-5-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-009", as: "security-0-0-card" },
        { card: "BT1-009", as: "security-0-1-card" },
        { card: "BT1-009", as: "security-0-2-card" },
        { card: "BT1-009", as: "security-0-3-card" },
        { card: "BT1-009", as: "security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT20-102",
          as: "own-omnimon-x",
          top: { card: "BT20-102", as: "own-card-omnimon-x-card" },
          dp: 16000,
          placedByEffect: false,
        },
        {
          card: "BT5-086",
          as: "own-omnimon",
          top: { card: "BT5-086", as: "own-card-omnimon-card" },
          dp: 14000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "deck-1-0-card" },
        { card: "BT1-009", as: "deck-1-1-card" },
        { card: "BT1-009", as: "deck-1-2-card" },
        { card: "BT1-009", as: "deck-1-3-card" },
        { card: "BT1-009", as: "deck-1-4-card" },
        { card: "BT1-009", as: "deck-1-5-card" },
        { card: "BT1-009", as: "deck-1-6-card" },
        { card: "BT1-009", as: "deck-1-7-card" },
        { card: "BT1-009", as: "deck-1-8-card" },
        { card: "BT1-009", as: "deck-1-9-card" },
        { card: "BT1-009", as: "deck-1-10-card" },
        { card: "BT1-009", as: "deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-009", as: "security-1-0-card" },
        { card: "BT1-009", as: "security-1-1-card" },
        { card: "BT1-009", as: "security-1-2-card" },
        { card: "BT1-009", as: "security-1-3-card" },
        { card: "BT1-009", as: "security-1-4-card" },
      ],
    },
  },
  memory: 6,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
