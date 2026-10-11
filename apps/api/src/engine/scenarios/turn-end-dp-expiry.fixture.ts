import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "turn-end-dp-expiry",
  board: {
    "0": {
      hand: [
        { card: "EX13-013", as: "dp-expiry-war-card", faceUp: false },
        { card: "LM-057", as: "dp-expiry-training-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-009", as: "dp-expiry-deck-0-0-card" },
        { card: "BT1-009", as: "dp-expiry-deck-0-1-card" },
        { card: "BT1-009", as: "dp-expiry-deck-0-2-card" },
        { card: "BT1-009", as: "dp-expiry-deck-0-3-card" },
        { card: "BT1-009", as: "dp-expiry-deck-0-4-card" },
        { card: "BT1-009", as: "dp-expiry-deck-0-5-card" },
        { card: "BT1-009", as: "dp-expiry-deck-0-6-card" },
        { card: "BT1-009", as: "dp-expiry-deck-0-7-card" },
        { card: "BT1-009", as: "dp-expiry-deck-0-8-card" },
        { card: "BT1-009", as: "dp-expiry-deck-0-9-card" },
        { card: "BT1-009", as: "dp-expiry-deck-0-10-card" },
        { card: "BT1-009", as: "dp-expiry-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-003", as: "dp-expiry-egg-0-card" }],
      security: [
        { card: "BT1-009", as: "dp-expiry-security-0-0-card" },
        { card: "BT1-009", as: "dp-expiry-security-0-1-card" },
        { card: "BT1-009", as: "dp-expiry-security-0-2-card" },
        { card: "BT1-009", as: "dp-expiry-security-0-3-card" },
        { card: "BT1-009", as: "dp-expiry-security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT1-014",
          as: "own-dp-expiry",
          top: { card: "BT1-014", as: "own-card-dp-expiry-card" },
          dp: 4000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "dp-expiry-deck-1-0-card" },
        { card: "BT1-009", as: "dp-expiry-deck-1-1-card" },
        { card: "BT1-009", as: "dp-expiry-deck-1-2-card" },
        { card: "BT1-009", as: "dp-expiry-deck-1-3-card" },
        { card: "BT1-009", as: "dp-expiry-deck-1-4-card" },
        { card: "BT1-009", as: "dp-expiry-deck-1-5-card" },
        { card: "BT1-009", as: "dp-expiry-deck-1-6-card" },
        { card: "BT1-009", as: "dp-expiry-deck-1-7-card" },
        { card: "BT1-009", as: "dp-expiry-deck-1-8-card" },
        { card: "BT1-009", as: "dp-expiry-deck-1-9-card" },
        { card: "BT1-009", as: "dp-expiry-deck-1-10-card" },
        { card: "BT1-009", as: "dp-expiry-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-003", as: "dp-expiry-egg-1-card" }],
      security: [
        { card: "BT1-009", as: "dp-expiry-security-1-0-card" },
        { card: "BT1-009", as: "dp-expiry-security-1-1-card" },
        { card: "BT1-009", as: "dp-expiry-security-1-2-card" },
        { card: "BT1-009", as: "dp-expiry-security-1-3-card" },
        { card: "BT1-009", as: "dp-expiry-security-1-4-card" },
      ],
      battleArea: [
        {
          card: "BT3-093",
          as: "opponent-dp-expiry-davis",
          top: { card: "BT3-093", as: "opponent-card-dp-expiry-davis-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
  },
  memory: 4,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
