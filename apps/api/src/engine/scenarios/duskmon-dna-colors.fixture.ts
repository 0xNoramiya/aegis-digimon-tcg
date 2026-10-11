import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "duskmon-dna-colors",
  board: {
    "0": {
      hand: [
        { card: "BT13-059", as: "duskmon-examon-card", faceUp: false },
        { card: "EX3-024", as: "duskmon-slayerdramon-card", faceUp: false },
      ],
      deck: [
        { card: "BT1-010", as: "duskmon-filler-0-5-card" },
        { card: "BT1-010", as: "duskmon-filler-0-6-card" },
        { card: "BT1-010", as: "duskmon-filler-0-7-card" },
        { card: "BT1-010", as: "duskmon-filler-0-8-card" },
        { card: "BT1-010", as: "duskmon-filler-0-9-card" },
        { card: "BT1-010", as: "duskmon-filler-0-10-card" },
        { card: "BT1-010", as: "duskmon-filler-0-11-card" },
      ],
      eggDeck: [{ card: "ST1-01", as: "duskmon-egg-0-card" }],
      security: [
        { card: "BT1-010", as: "duskmon-filler-0-4-card" },
        { card: "BT1-010", as: "duskmon-filler-0-3-card" },
        { card: "BT1-010", as: "duskmon-filler-0-2-card" },
        { card: "BT1-010", as: "duskmon-filler-0-1-card" },
        { card: "BT1-010", as: "duskmon-filler-0-0-card" },
      ],
      battleArea: [
        {
          card: "EX13-021",
          as: "own-duskmon-changed",
          top: { card: "EX13-021", as: "own-card-duskmon-changed-card" },
          dp: 7000,
          placedByEffect: false,
          under: [{ card: "EX13-008", as: "own-source-duskmon-changed-0-card" }],
        },
        {
          card: "BT1-081",
          as: "own-duskmon-green",
          top: { card: "BT1-081", as: "own-card-duskmon-green-card" },
          dp: 10000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: [{ card: "BT18-078", as: "duskmon-color-source-card", faceUp: false }],
      deck: [
        { card: "BT1-010", as: "duskmon-filler-1-5-card" },
        { card: "BT1-010", as: "duskmon-filler-1-6-card" },
        { card: "BT1-010", as: "duskmon-filler-1-7-card" },
        { card: "BT1-010", as: "duskmon-filler-1-8-card" },
        { card: "BT1-010", as: "duskmon-filler-1-9-card" },
        { card: "BT1-010", as: "duskmon-filler-1-10-card" },
        { card: "BT1-010", as: "duskmon-filler-1-11-card" },
      ],
      eggDeck: [{ card: "ST1-01", as: "duskmon-egg-1-card" }],
      security: [
        { card: "BT1-010", as: "duskmon-filler-1-4-card" },
        { card: "BT1-010", as: "duskmon-filler-1-3-card" },
        { card: "BT1-010", as: "duskmon-filler-1-2-card" },
        { card: "BT1-010", as: "duskmon-filler-1-1-card" },
        { card: "BT1-010", as: "duskmon-filler-1-0-card" },
      ],
    },
  },
  memory: 9,
  turnSeat: 1,
  turnCount: 1,
  isFirstPlayersFirstTurn: false,
  presentation: {
    opponent: {
      endBreeding: true,
      fallbackMain: "end",
      main: [{ kind: "play", card: "BT18-078" }],
      decisions: [
        { sourceCard: "BT18-078", kind: "chooseTargets", target: "own-duskmon-changed" },
        { sourceCard: "BT18-078", kind: "chooseOption", choice: "Red" },
      ],
    },
  },
};

export default fixture;
