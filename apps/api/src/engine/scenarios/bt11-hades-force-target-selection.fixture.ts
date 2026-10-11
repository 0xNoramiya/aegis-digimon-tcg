import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "bt11-hades-force-target-selection",
  board: {
    "0": {
      hand: [{ card: "BT11-107", as: "hades-option-card", faceUp: false }],
      deck: [
        { card: "BT1-009", as: "hades-deck-0-0-card" },
        { card: "BT1-009", as: "hades-deck-0-1-card" },
        { card: "BT1-009", as: "hades-deck-0-2-card" },
        { card: "BT1-009", as: "hades-deck-0-3-card" },
        { card: "BT1-009", as: "hades-deck-0-4-card" },
        { card: "BT1-009", as: "hades-deck-0-5-card" },
        { card: "BT1-009", as: "hades-deck-0-6-card" },
        { card: "BT1-009", as: "hades-deck-0-7-card" },
        { card: "BT1-009", as: "hades-deck-0-8-card" },
        { card: "BT1-009", as: "hades-deck-0-9-card" },
        { card: "BT1-009", as: "hades-deck-0-10-card" },
        { card: "BT1-009", as: "hades-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-003", as: "hades-egg-0-card" }],
      security: [
        { card: "BT1-009", as: "hades-security-0-0-card" },
        { card: "BT1-009", as: "hades-security-0-1-card" },
        { card: "BT1-009", as: "hades-security-0-2-card" },
        { card: "BT1-009", as: "hades-security-0-3-card" },
        { card: "BT1-009", as: "hades-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT12-070",
          as: "own-hades-greymon",
          top: { card: "BT12-070", as: "own-card-hades-greymon-card" },
          dp: 12000,
          placedByEffect: false,
          under: [{ card: "BT9-109", as: "own-source-hades-greymon-0-card" }],
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "hades-deck-1-0-card" },
        { card: "BT1-009", as: "hades-deck-1-1-card" },
        { card: "BT1-009", as: "hades-deck-1-2-card" },
        { card: "BT1-009", as: "hades-deck-1-3-card" },
        { card: "BT1-009", as: "hades-deck-1-4-card" },
        { card: "BT1-009", as: "hades-deck-1-5-card" },
        { card: "BT1-009", as: "hades-deck-1-6-card" },
        { card: "BT1-009", as: "hades-deck-1-7-card" },
        { card: "BT1-009", as: "hades-deck-1-8-card" },
        { card: "BT1-009", as: "hades-deck-1-9-card" },
        { card: "BT1-009", as: "hades-deck-1-10-card" },
        { card: "BT1-009", as: "hades-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-003", as: "hades-egg-1-card" }],
      security: [
        { card: "BT1-009", as: "hades-security-1-0-card" },
        { card: "BT1-009", as: "hades-security-1-1-card" },
        { card: "BT1-009", as: "hades-security-1-2-card" },
        { card: "BT1-009", as: "hades-security-1-3-card" },
        { card: "BT1-009", as: "hades-security-1-4-card" },
      ],
      battleArea: [
        {
          card: "BT4-093",
          as: "opponent-hades-tamer",
          top: { card: "BT4-093", as: "opponent-card-hades-tamer-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "EX4-015",
          as: "opponent-hades-rookie",
          top: { card: "EX4-015", as: "opponent-card-hades-rookie-card" },
          dp: 1000,
          placedByEffect: false,
        },
        {
          card: "EX7-023",
          as: "opponent-hades-hexeblau",
          top: { card: "EX7-023", as: "opponent-card-hades-hexeblau-card" },
          dp: 12000,
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
