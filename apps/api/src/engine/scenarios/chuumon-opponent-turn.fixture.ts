import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "chuumon-opponent-turn",
  board: {
    "0": {
      hand: [{ card: "EX5-045", as: "hand-chuumon-card" }],
      deck: [
        { card: "BT1-085", as: "draw-card" },
        { card: "EX5-045", as: "deck-chuumon-card" },
        { card: "BT1-085", as: "kingsukamon-reveal-1-card" },
        { card: "BT1-085", as: "kingsukamon-reveal-2-card" },
        { card: "BT3-063", as: "deck-sukamon-card" },
        { card: "BT1-085", as: "chuumon-reveal-1-card" },
        { card: "BT1-085", as: "chuumon-reveal-2-card" },
        { card: "BT1-085", as: "deck-0-0-card" },
        { card: "BT1-085", as: "deck-0-1-card" },
        { card: "BT1-085", as: "deck-0-2-card" },
        { card: "BT1-085", as: "deck-0-3-card" },
        { card: "BT1-085", as: "deck-0-4-card" },
        { card: "BT1-085", as: "deck-0-5-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-0-card" }],
      security: [
        { card: "BT1-010", as: "security-0-0-card" },
        { card: "BT1-010", as: "security-0-1-card" },
        { card: "BT1-010", as: "security-0-2-card" },
        { card: "BT1-010", as: "security-0-3-card" },
      ],
      battleArea: [
        {
          card: "EX13-035",
          as: "own-kingetemon",
          top: { card: "EX13-035", as: "own-card-kingetemon-card" },
          dp: 13000,
          placedByEffect: false,
          under: [{ card: "EX13-031", as: "own-source-kingetemon-0-card" }],
        },
        {
          card: "BT3-063",
          as: "own-sukamon-a",
          top: { card: "BT3-063", as: "own-card-sukamon-a-card" },
          dp: 1000,
          placedByEffect: false,
        },
        {
          card: "BT3-063",
          as: "own-sukamon-b",
          top: { card: "BT3-063", as: "own-card-sukamon-b-card" },
          dp: 1000,
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
        { card: "BT1-085", as: "deck-1-10-card" },
        { card: "BT1-085", as: "deck-1-11-card" },
      ],
      eggDeck: [{ card: "BT1-001", as: "egg-1-card" }],
      security: [
        { card: "BT1-010", as: "security-1-0-card" },
        { card: "BT1-010", as: "security-1-1-card" },
        { card: "BT1-010", as: "security-1-2-card" },
        { card: "BT1-010", as: "security-1-3-card" },
      ],
      battleArea: [
        {
          card: "EX9-049",
          as: "opponent-bot-sukamon",
          top: { card: "EX9-049", as: "opponent-card-bot-sukamon-card" },
          dp: 3000,
          placedByEffect: false,
          suspended: true,
          under: [{ card: "EX13-040", as: "opponent-source-bot-sukamon-0-card" }],
        },
      ],
    },
  },
  memory: 2,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
