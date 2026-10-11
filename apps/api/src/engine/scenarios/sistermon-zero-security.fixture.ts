import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "sistermon-zero-security",
  board: {
    "0": {
      hand: [
        { card: "BT23-076", as: "blanc-first-card", faceUp: false },
        { card: "BT23-076", as: "blanc-second-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-009", as: "draw-0-card" },
        { card: "BT1-010", as: "recovery-first-0-card" },
        { card: "BT1-011", as: "recovery-second-0-card" },
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
      ],
      eggDeck: [{ card: "BT1-003", as: "egg-0-card" }],
    },
    "1": {
      deck: [
        { card: "BT1-009", as: "draw-1-card" },
        { card: "BT1-010", as: "recovery-first-1-card" },
        { card: "BT1-011", as: "recovery-second-1-card" },
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
      ],
      eggDeck: [{ card: "BT1-003", as: "egg-1-card" }],
      security: [
        { card: "BT1-009", as: "security-0-card" },
        { card: "BT1-009", as: "security-1-card" },
        { card: "BT1-009", as: "security-2-card" },
        { card: "BT1-009", as: "security-3-card" },
        { card: "BT1-009", as: "security-4-card" },
      ],
    },
  },
  memory: 6,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
