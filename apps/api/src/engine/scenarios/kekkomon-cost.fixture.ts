import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "kekkomon-cost",
  board: {
    "0": {
      hand: [
        { card: "ST23-07", as: "evolution-0-card" },
        { card: "ST23-07", as: "evolution-1-card" },
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
      eggDeck: [{ card: "ST23-01", as: "egg-0-card" }],
      security: [
        { card: "BT1-009", as: "security-0-0-card" },
        { card: "BT1-009", as: "security-0-1-card" },
        { card: "BT1-009", as: "security-0-2-card" },
      ],
      battleArea: [
        {
          card: "ST23-06",
          as: "own-gecko",
          top: { card: "ST23-06", as: "own-card-gecko-card" },
          dp: 1000,
          placedByEffect: false,
          under: [{ card: "ST23-01", as: "own-source-gecko-0-card" }],
        },
        {
          card: "ST23-02",
          as: "own-helper",
          top: { card: "ST23-02", as: "own-card-helper-card" },
          dp: 2000,
          placedByEffect: false,
          under: [{ card: "ST23-01", as: "own-source-helper-0-card" }],
        },
        {
          card: "ST23-13",
          as: "own-tamer-0",
          top: { card: "ST23-13", as: "own-card-tamer-0-card" },
          dp: 0,
          placedByEffect: false,
          suspended: true,
          under: [
            { card: "ST23-02", as: "bottom-0-card", faceUp: false },
            { card: "ST23-06", as: "next-0-card", faceUp: false },
          ],
        },
        {
          card: "BT25-090",
          as: "own-tamer-1",
          top: { card: "BT25-090", as: "own-card-tamer-1-card" },
          dp: 0,
          placedByEffect: false,
          suspended: true,
          under: [
            { card: "ST23-02", as: "bottom-1-card", faceUp: false },
            { card: "ST23-06", as: "next-1-card", faceUp: false },
          ],
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
      eggDeck: [{ card: "ST23-01", as: "egg-1-card" }],
      security: [
        { card: "BT1-009", as: "security-1-0-card" },
        { card: "BT1-009", as: "security-1-1-card" },
        { card: "BT1-009", as: "security-1-2-card" },
      ],
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
