import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "shakkoumon-yellow-only",
  board: {
    "0": {
      hand: [{ card: "BT23-032", as: "shakkoumon-result-card", faceUp: false }],
      deck: [
        { card: "BT1-010", as: "shakkoumon-filler-0-5-card" },
        { card: "BT1-010", as: "shakkoumon-filler-0-6-card" },
        { card: "BT1-010", as: "shakkoumon-filler-0-7-card" },
        { card: "BT1-010", as: "shakkoumon-filler-0-8-card" },
        { card: "BT1-010", as: "shakkoumon-filler-0-9-card" },
        { card: "BT1-010", as: "shakkoumon-filler-0-10-card" },
        { card: "BT1-010", as: "shakkoumon-filler-0-11-card" },
      ],
      eggDeck: [{ card: "ST1-01", as: "shakkoumon-egg-0-card" }],
      security: [
        { card: "BT1-010", as: "shakkoumon-filler-0-4-card" },
        { card: "BT1-010", as: "shakkoumon-filler-0-3-card" },
        { card: "BT1-010", as: "shakkoumon-filler-0-2-card" },
        { card: "BT1-010", as: "shakkoumon-filler-0-1-card" },
        { card: "BT1-010", as: "shakkoumon-filler-0-0-card" },
      ],
      battleArea: [
        {
          card: "EX13-028",
          as: "own-shakkoumon-ex13",
          top: { card: "EX13-028", as: "own-card-shakkoumon-ex13-card" },
          dp: 2000,
          placedByEffect: false,
        },
        {
          card: "EX13-028",
          as: "own-shakkoumon-second-yellow",
          top: { card: "EX13-028", as: "own-card-shakkoumon-second-yellow-card" },
          dp: 2000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      deck: [
        { card: "BT1-010", as: "shakkoumon-filler-1-5-card" },
        { card: "BT1-010", as: "shakkoumon-filler-1-6-card" },
        { card: "BT1-010", as: "shakkoumon-filler-1-7-card" },
        { card: "BT1-010", as: "shakkoumon-filler-1-8-card" },
        { card: "BT1-010", as: "shakkoumon-filler-1-9-card" },
        { card: "BT1-010", as: "shakkoumon-filler-1-10-card" },
        { card: "BT1-010", as: "shakkoumon-filler-1-11-card" },
      ],
      eggDeck: [{ card: "ST1-01", as: "shakkoumon-egg-1-card" }],
      security: [
        { card: "BT1-010", as: "shakkoumon-filler-1-4-card" },
        { card: "BT1-010", as: "shakkoumon-filler-1-3-card" },
        { card: "BT1-010", as: "shakkoumon-filler-1-2-card" },
        { card: "BT1-010", as: "shakkoumon-filler-1-1-card" },
        { card: "BT1-010", as: "shakkoumon-filler-1-0-card" },
      ],
    },
  },
  memory: 0,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
