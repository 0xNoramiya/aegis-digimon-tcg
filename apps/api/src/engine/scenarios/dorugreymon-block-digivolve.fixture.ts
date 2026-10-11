import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "dorugreymon-block-digivolve",
  board: {
    "0": {
      hand: [{ card: "BT16-064", as: "dorugoramon-card", faceUp: false }],
      deck: [
        { card: "BT1-085", as: "deck-0-0-card" },
        { card: "BT1-085", as: "deck-0-1-card" },
        { card: "BT1-085", as: "deck-0-2-card" },
        { card: "BT1-085", as: "deck-0-3-card" },
        { card: "BT1-085", as: "deck-0-4-card" },
        { card: "BT1-085", as: "deck-0-5-card" },
        { card: "BT1-085", as: "deck-0-6-card" },
        { card: "BT1-085", as: "deck-0-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-085", as: "security-0-0-card" },
        { card: "BT1-085", as: "security-0-1-card" },
        { card: "BT1-085", as: "security-0-2-card" },
      ],
      battleArea: [
        {
          card: "BT16-061",
          as: "own-dorugreymon",
          top: { card: "BT16-061", as: "own-card-dorugreymon-card" },
          dp: 7000,
          placedByEffect: false,
          under: [{ card: "BT16-087", as: "own-source-dorugreymon-0-card" }],
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
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-085", as: "security-1-0-card" },
        { card: "BT1-085", as: "security-1-1-card" },
        { card: "BT1-085", as: "security-1-2-card" },
      ],
      battleArea: [
        {
          card: "BT1-009",
          as: "opponent-attacker",
          top: { card: "BT1-009", as: "opponent-card-attacker-card" },
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
