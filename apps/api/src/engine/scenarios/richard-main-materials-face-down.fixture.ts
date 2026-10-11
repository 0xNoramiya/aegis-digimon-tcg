import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "richard-main-materials-face-down",
  board: {
    "0": {
      hand: [{ card: "BT3-043", as: "richard-kentaurosmon-card", faceUp: false }],
      deck: [
        { card: "BT1-085", as: "richard-deck-0-0-card" },
        { card: "BT1-085", as: "richard-deck-0-1-card" },
        { card: "BT1-085", as: "richard-deck-0-2-card" },
        { card: "BT1-085", as: "richard-deck-0-3-card" },
        { card: "BT1-085", as: "richard-deck-0-4-card" },
        { card: "BT1-085", as: "richard-deck-0-5-card" },
        { card: "BT1-085", as: "richard-deck-0-6-card" },
        { card: "BT1-085", as: "richard-deck-0-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "richard-egg-0-card" }],
      security: [
        { card: "BT1-085", as: "richard-security-0-0-card" },
        { card: "BT1-085", as: "richard-security-0-1-card" },
        { card: "BT1-085", as: "richard-security-0-2-card" },
      ],
      battleArea: [
        {
          card: "EX13-071",
          as: "own-richard",
          top: { card: "EX13-071", as: "own-card-richard-card" },
          dp: 0,
          placedByEffect: false,
          under: [
            { card: "EX13-030", as: "own-source-richard-0-card", faceUp: false },
            { card: "EX13-032", as: "own-source-richard-1-card", faceUp: false },
            { card: "BT1-085", as: "own-source-richard-2-card", faceUp: false },
          ],
        },
        {
          card: "EX13-026",
          as: "own-richard-kudamon",
          top: { card: "EX13-026", as: "own-card-richard-kudamon-card" },
          dp: 1000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-085", as: "richard-deck-1-0-card" },
        { card: "BT1-085", as: "richard-deck-1-1-card" },
        { card: "BT1-085", as: "richard-deck-1-2-card" },
        { card: "BT1-085", as: "richard-deck-1-3-card" },
        { card: "BT1-085", as: "richard-deck-1-4-card" },
        { card: "BT1-085", as: "richard-deck-1-5-card" },
        { card: "BT1-085", as: "richard-deck-1-6-card" },
        { card: "BT1-085", as: "richard-deck-1-7-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "richard-egg-1-card" }],
      security: [
        { card: "BT1-085", as: "richard-security-1-0-card" },
        { card: "BT1-085", as: "richard-security-1-1-card" },
        { card: "BT1-085", as: "richard-security-1-2-card" },
      ],
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
