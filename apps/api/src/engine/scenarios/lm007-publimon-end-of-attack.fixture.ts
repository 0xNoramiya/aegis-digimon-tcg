import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "lm007-publimon-end-of-attack",
  board: {
    "0": {
      deck: [
        { card: "BT1-009", as: "publimon-deck-0-0-card" },
        { card: "BT1-009", as: "publimon-deck-0-1-card" },
        { card: "BT1-009", as: "publimon-deck-0-2-card" },
        { card: "BT1-009", as: "publimon-deck-0-3-card" },
        { card: "BT1-009", as: "publimon-deck-0-4-card" },
        { card: "BT1-009", as: "publimon-deck-0-5-card" },
        { card: "BT1-009", as: "publimon-deck-0-6-card" },
        { card: "BT1-009", as: "publimon-deck-0-7-card" },
        { card: "BT1-009", as: "publimon-deck-0-8-card" },
        { card: "BT1-009", as: "publimon-deck-0-9-card" },
        { card: "BT1-009", as: "publimon-deck-0-10-card" },
        { card: "BT1-009", as: "publimon-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "publimon-egg-0-card" }],
      security: [
        { card: "BT1-010", as: "publimon-security-0-0-card" },
        { card: "BT1-010", as: "publimon-security-0-1-card" },
        { card: "BT1-010", as: "publimon-security-0-2-card" },
        { card: "BT1-010", as: "publimon-security-0-3-card" },
      ],
      battleArea: [
        {
          card: "LM-007",
          as: "own-publimon-own",
          top: { card: "LM-007", as: "own-card-publimon-own-card" },
          dp: 5000,
          placedByEffect: false,
        },
        {
          card: "BT1-027",
          as: "own-publimon-attacker",
          top: { card: "BT1-027", as: "own-card-publimon-attacker-card" },
          dp: 4000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "publimon-deck-1-0-card" },
        { card: "BT1-009", as: "publimon-deck-1-1-card" },
        { card: "BT1-009", as: "publimon-deck-1-2-card" },
        { card: "BT1-009", as: "publimon-deck-1-3-card" },
        { card: "BT1-009", as: "publimon-deck-1-4-card" },
        { card: "BT1-009", as: "publimon-deck-1-5-card" },
        { card: "BT1-009", as: "publimon-deck-1-6-card" },
        { card: "BT1-009", as: "publimon-deck-1-7-card" },
        { card: "BT1-009", as: "publimon-deck-1-8-card" },
        { card: "BT1-009", as: "publimon-deck-1-9-card" },
        { card: "BT1-009", as: "publimon-deck-1-10-card" },
        { card: "BT1-009", as: "publimon-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "publimon-egg-1-card" }],
      security: [
        { card: "LM-007", as: "publimon-bot-security-card" },
        { card: "BT1-010", as: "publimon-security-1-0-card" },
        { card: "BT1-010", as: "publimon-security-1-1-card" },
        { card: "BT1-010", as: "publimon-security-1-2-card" },
        { card: "BT1-010", as: "publimon-security-1-3-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
