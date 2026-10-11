import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "shellmon-ts",
  board: {
    "0": {
      hand: [
        { card: "BT24-025", as: "shellmon-0-card" },
        { card: "BT24-025", as: "shellmon-1-card" },
        { card: "BT24-025", as: "shellmon-2-card" },
        { card: "BT24-025", as: "shellmon-3-card" },
      ],
      deck: [
        { card: "BT1-009", as: "deck-0-0-card" },
        { card: "BT1-009", as: "deck-0-1-card" },
        { card: "BT1-009", as: "deck-0-2-card" },
        { card: "BT1-009", as: "deck-0-3-card" },
        { card: "BT1-009", as: "deck-0-4-card" },
        { card: "BT1-009", as: "deck-0-5-card" },
        { card: "BT1-009", as: "deck-0-6-card" },
        { card: "BT1-009", as: "deck-0-7-card" },
        { card: "BT1-009", as: "deck-0-8-card" },
        { card: "BT1-009", as: "deck-0-9-card" },
        { card: "BT1-009", as: "deck-0-10-card" },
        { card: "BT1-009", as: "deck-0-11-card" },
      ],
      security: [
        { card: "BT1-009", as: "security-0-0-card" },
        { card: "BT1-009", as: "security-0-1-card" },
        { card: "BT1-009", as: "security-0-2-card" },
      ],
      battleArea: [
        {
          card: "BT24-033",
          as: "own-BT24-033",
          top: { card: "BT24-033", as: "own-card-BT24-033-card" },
          dp: 1000,
          placedByEffect: false,
        },
        {
          card: "BT24-009",
          as: "own-BT24-009",
          top: { card: "BT24-009", as: "own-card-BT24-009-card" },
          dp: 1000,
          placedByEffect: false,
        },
        {
          card: "BT1-028",
          as: "own-BT1-028",
          top: { card: "BT1-028", as: "own-card-BT1-028-card" },
          dp: 3000,
          placedByEffect: false,
        },
        {
          card: "BT1-045",
          as: "own-BT1-045",
          top: { card: "BT1-045", as: "own-card-BT1-045-card" },
          dp: 3000,
          placedByEffect: false,
        },
        {
          card: "BT24-011",
          as: "own-BT24-011",
          top: { card: "BT24-011", as: "own-card-BT24-011-card" },
          dp: 5000,
          placedByEffect: false,
        },
      ],
      breeding: {
        card: "BT24-033",
        as: "own-breeding",
        top: { card: "BT24-033", as: "own-card-breeding-card" },
        dp: 1000,
        placedByEffect: false,
      },
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
      security: [
        { card: "BT1-009", as: "security-1-0-card" },
        { card: "BT1-009", as: "security-1-1-card" },
        { card: "BT1-009", as: "security-1-2-card" },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
