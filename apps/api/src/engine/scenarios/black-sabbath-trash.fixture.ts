import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "black-sabbath-trash",
  board: {
    "0": {
      hand: [
        { card: "BT1-027", as: "hand-0-card" },
        { card: "BT1-027", as: "hand-1-card" },
        { card: "BT1-027", as: "hand-2-card" },
        { card: "BT1-027", as: "hand-3-card" },
      ],
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
      trash: [{ card: "LM-068", as: "black-sabbath-card" }],
      security: [
        { card: "BT1-027", as: "security-0-0-card" },
        { card: "BT1-027", as: "security-0-1-card" },
        { card: "BT1-027", as: "security-0-2-card" },
        { card: "BT1-027", as: "security-0-3-card" },
      ],
      battleArea: [
        {
          card: "EX11-049",
          as: "own-punkmon",
          top: { card: "EX11-049", as: "own-card-punkmon-card" },
          dp: 6000,
          placedByEffect: false,
          under: [{ card: "EX7-050", as: "own-source-punkmon-0-card" }],
        },
      ],
    },
    "1": {
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
        { card: "BT1-027", as: "security-1-0-card" },
        { card: "BT1-027", as: "security-1-1-card" },
        { card: "BT1-027", as: "security-1-2-card" },
        { card: "BT1-027", as: "security-1-3-card" },
      ],
      battleArea: [
        {
          card: "BT1-020",
          as: "opponent-groundramon",
          top: { card: "BT1-020", as: "opponent-card-groundramon-card" },
          dp: 6000,
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
