import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "omnimon-main-dna",
  board: {
    "0": {
      hand: [
        { card: "EX13-016", as: "omnimon-card", faceUp: false },
        { card: "EX13-077", as: "merciful-card", faceUp: false },
      ],
      deck: [
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
        { card: "BT1-009", as: "deck-0-10-card" },
        { card: "BT1-009", as: "deck-0-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-009", as: "security-0-0-card" },
        { card: "BT1-009", as: "security-0-1-card" },
        { card: "BT1-009", as: "security-0-2-card" },
        { card: "BT1-009", as: "security-0-3-card" },
        { card: "BT1-009", as: "security-0-4-card" },
      ],
      battleArea: [
        {
          card: "BT22-013",
          as: "own-grey",
          top: { card: "BT22-013", as: "own-card-grey-card" },
          dp: 12000,
          placedByEffect: false,
          under: [{ card: "BT22-008", as: "own-source-grey-0-card" }],
        },
        {
          card: "BT17-027",
          as: "own-garuru",
          top: { card: "BT17-027", as: "own-card-garuru-card" },
          dp: 11000,
          placedByEffect: false,
        },
        {
          card: "BT22-026",
          as: "own-garuru-second",
          top: { card: "BT22-026", as: "own-card-garuru-second-card" },
          dp: 12000,
          placedByEffect: false,
          under: [{ card: "BT1-029", as: "own-source-garuru-second-0-card" }],
        },
      ],
    },
    "1": {
      deck: [
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
        { card: "BT1-009", as: "deck-1-10-card" },
        { card: "BT1-009", as: "deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-009", as: "security-1-0-card" },
        { card: "BT1-009", as: "security-1-1-card" },
        { card: "BT1-009", as: "security-1-2-card" },
        { card: "BT1-009", as: "security-1-3-card" },
        { card: "BT1-009", as: "security-1-4-card" },
      ],
    },
  },
  memory: 2,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
