import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "rie-kishibe-security-gate",
  board: {
    "0": {
      hand: [
        { card: "EX13-064", as: "lordknightmon-0-card" },
        { card: "EX13-064", as: "lordknightmon-1-card" },
      ],
      deck: [
        { card: "BT1-085", as: "deck-0-0-card" },
        { card: "BT1-085", as: "deck-0-1-card" },
        { card: "BT1-085", as: "deck-0-2-card" },
        { card: "BT1-085", as: "deck-0-3-card" },
        { card: "BT1-085", as: "deck-0-4-card" },
        { card: "BT1-085", as: "deck-0-5-card" },
        { card: "BT1-085", as: "deck-0-6-card" },
        { card: "BT1-085", as: "deck-0-7-card" },
        { card: "BT1-085", as: "deck-0-8-card" },
        { card: "BT1-085", as: "deck-0-9-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-085", as: "security-0-0-card" },
        { card: "BT1-085", as: "security-0-1-card" },
        { card: "BT1-085", as: "security-0-2-card" },
        { card: "BT1-085", as: "security-0-3-card" },
        { card: "BT1-085", as: "security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT22-090",
          as: "own-rie",
          top: { card: "BT22-090", as: "own-card-rie-card" },
          dp: 0,
          placedByEffect: false,
        },
        {
          card: "BT22-083",
          as: "own-payment",
          top: { card: "BT22-083", as: "own-card-payment-card" },
          dp: 0,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "deck-1-0-card" },
        { card: "BT1-085", as: "deck-1-1-card" },
        { card: "BT1-085", as: "deck-1-2-card" },
        { card: "BT1-085", as: "deck-1-3-card" },
        { card: "BT1-085", as: "deck-1-4-card" },
        { card: "BT1-085", as: "deck-1-5-card" },
        { card: "BT1-085", as: "deck-1-6-card" },
        { card: "BT1-085", as: "deck-1-7-card" },
        { card: "BT1-085", as: "deck-1-8-card" },
        { card: "BT1-085", as: "deck-1-9-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-085", as: "security-1-0-card" },
        { card: "BT1-085", as: "security-1-1-card" },
        { card: "BT1-085", as: "security-1-2-card" },
        { card: "BT1-085", as: "security-1-3-card" },
        { card: "BT1-085", as: "security-1-4-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
