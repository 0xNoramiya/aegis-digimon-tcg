import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "greymon-security-two-zones",
  board: {
    "0": {
      hand: [
        { card: "ST15-14", as: "greymon-zones-tai-card", faceUp: false },
        { card: "BT1-009", as: "greymon-zones-hand-0-card", faceUp: false },
        { card: "BT1-009", as: "greymon-zones-hand-1-card", faceUp: false },
        { card: "BT1-009", as: "greymon-zones-hand-2-card", faceUp: false },
        { card: "BT1-009", as: "greymon-zones-hand-3-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-009", as: "greymon-zones-deck-0-0-card" },
        { card: "BT1-009", as: "greymon-zones-deck-0-1-card" },
        { card: "BT1-009", as: "greymon-zones-deck-0-2-card" },
        { card: "BT1-009", as: "greymon-zones-deck-0-3-card" },
        { card: "BT1-009", as: "greymon-zones-deck-0-4-card" },
        { card: "BT1-009", as: "greymon-zones-deck-0-5-card" },
        { card: "BT1-009", as: "greymon-zones-deck-0-6-card" },
        { card: "BT1-009", as: "greymon-zones-deck-0-7-card" },
        { card: "BT1-009", as: "greymon-zones-deck-0-8-card" },
        { card: "BT1-009", as: "greymon-zones-deck-0-9-card" },
        { card: "BT1-009", as: "greymon-zones-deck-0-10-card" },
        { card: "BT1-009", as: "greymon-zones-deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "greymon-zones-egg-0-card" }],
      trash: [
        { card: "ST15-02", as: "greymon-zones-agumon-card" },
        { card: "BT1-009", as: "greymon-zones-trash-0-card" },
        { card: "BT1-009", as: "greymon-zones-trash-1-card" },
        { card: "BT1-009", as: "greymon-zones-trash-2-card" },
        { card: "BT1-009", as: "greymon-zones-trash-3-card" },
        { card: "BT1-009", as: "greymon-zones-trash-4-card" },
      ],
      security: [
        { card: "ST15-08", as: "greymon-zones-greymon-card" },
        { card: "BT1-009", as: "greymon-zones-security-0-0-card" },
        { card: "BT1-009", as: "greymon-zones-security-0-1-card" },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "greymon-zones-deck-1-0-card" },
        { card: "BT1-009", as: "greymon-zones-deck-1-1-card" },
        { card: "BT1-009", as: "greymon-zones-deck-1-2-card" },
        { card: "BT1-009", as: "greymon-zones-deck-1-3-card" },
        { card: "BT1-009", as: "greymon-zones-deck-1-4-card" },
        { card: "BT1-009", as: "greymon-zones-deck-1-5-card" },
        { card: "BT1-009", as: "greymon-zones-deck-1-6-card" },
        { card: "BT1-009", as: "greymon-zones-deck-1-7-card" },
        { card: "BT1-009", as: "greymon-zones-deck-1-8-card" },
        { card: "BT1-009", as: "greymon-zones-deck-1-9-card" },
        { card: "BT1-009", as: "greymon-zones-deck-1-10-card" },
        { card: "BT1-009", as: "greymon-zones-deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "greymon-zones-egg-1-card" }],
      security: [
        { card: "BT1-009", as: "greymon-zones-security-1-0-card" },
        { card: "BT1-009", as: "greymon-zones-security-1-1-card" },
        { card: "BT1-009", as: "greymon-zones-security-1-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-009",
          as: "opponent-greymon-zones-attacker",
          top: { card: "BT1-009", as: "opponent-card-greymon-zones-attacker-card" },
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
