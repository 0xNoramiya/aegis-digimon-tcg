import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "bt20-dragon-gene-security",
  board: {
    "0": {
      hand: [{ card: "BT20-007", as: "dragon-gene-security-hand-card", faceUp: false }],
      deck: [
        { card: "BT1-010", as: "dragon-gene-security-deck-0-0-card" },
        { card: "BT20-023", as: "dragon-gene-security-deck-0-1-card" },
        { card: "EX3-074", as: "dragon-gene-security-deck-0-2-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-0-3-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-0-4-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-0-5-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-0-6-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-0-7-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-0-8-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-0-9-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-0-10-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-0-11-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-0-12-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "dragon-gene-security-egg-0-card" }],
      trash: [{ card: "EX3-037", as: "dragon-gene-security-trash-card" }],
      security: [{ card: "BT20-093", as: "dragon-gene-security-option-card" }],
      battleArea: [
        {
          card: "BT1-010",
          as: "own-dragon-gene-security-human",
          top: { card: "BT1-010", as: "own-card-dragon-gene-security-human-card" },
          dp: 2000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-010", as: "dragon-gene-security-deck-1-0-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-1-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-2-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-3-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-4-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-5-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-6-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-7-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-8-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-9-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-10-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-11-card" },
        { card: "BT1-010", as: "dragon-gene-security-deck-1-12-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "dragon-gene-security-egg-1-card" }],
      security: [{ card: "BT1-010", as: "dragon-gene-security-bot-card" }],
      battleArea: [
        {
          card: "BT1-010",
          as: "opponent-dragon-gene-security-attacker",
          top: { card: "BT1-010", as: "opponent-card-dragon-gene-security-attacker-card" },
          dp: 2000,
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
