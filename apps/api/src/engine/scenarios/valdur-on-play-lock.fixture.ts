import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "valdur-on-play-lock",
  board: {
    "0": {
      hand: [{ card: "BT20-037", as: "valdur-card" }],
      deck: [
        { card: "BT1-027", as: "deck-0-0-card" },
        { card: "BT1-027", as: "deck-0-1-card" },
        { card: "BT1-027", as: "deck-0-2-card" },
        { card: "BT1-027", as: "deck-0-3-card" },
        { card: "BT1-027", as: "deck-0-4-card" },
        { card: "BT1-027", as: "deck-0-5-card" },
        { card: "BT1-027", as: "deck-0-6-card" },
        { card: "BT1-027", as: "deck-0-7-card" },
        { card: "BT1-027", as: "deck-0-8-card" },
        { card: "BT1-027", as: "deck-0-9-card" },
        { card: "BT1-027", as: "deck-0-10-card" },
        { card: "BT1-027", as: "deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-027", as: "security-0-0-card" },
        { card: "BT1-027", as: "security-0-1-card" },
        { card: "BT1-027", as: "security-0-2-card" },
        { card: "BT1-027", as: "security-0-3-card" },
        { card: "BT1-027", as: "security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT20-035",
          as: "own-kazuchimon",
          top: { card: "BT20-035", as: "own-card-kazuchimon-card" },
          dp: 12000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: [
        { card: "P-017", as: "locked-demidevimon-card" },
        { card: "P-017", as: "unlocked-demidevimon-card" },
      ],
      deck: [
        { card: "BT1-027", as: "deck-1-0-card" },
        { card: "BT1-027", as: "deck-1-1-card" },
        { card: "BT1-027", as: "deck-1-2-card" },
        { card: "BT1-027", as: "deck-1-3-card" },
        { card: "BT1-027", as: "deck-1-4-card" },
        { card: "BT1-027", as: "deck-1-5-card" },
        { card: "BT1-027", as: "deck-1-6-card" },
        { card: "BT1-027", as: "deck-1-7-card" },
        { card: "BT1-027", as: "deck-1-8-card" },
        { card: "BT1-027", as: "deck-1-9-card" },
        { card: "BT1-027", as: "deck-1-10-card" },
        { card: "BT1-027", as: "deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT10-086", as: "security-1-0-card" },
        { card: "BT10-086", as: "security-1-1-card" },
        { card: "BT10-086", as: "security-1-2-card" },
        { card: "BT10-086", as: "security-1-3-card" },
      ],
      battleArea: [
        {
          card: "BT1-085",
          as: "opponent-tai",
          top: { card: "BT1-085", as: "opponent-card-tai-card" },
          dp: 0,
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
