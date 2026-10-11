import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "sukamon-dna-materials",
  board: {
    "0": {
      hand: [{ card: "EX13-045", as: "sukamon-dna-examon-card", faceUp: false }],
      deck: [
        { card: "BT1-010", as: "sukamon-dna-filler-0-5-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-0-6-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-0-7-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-0-8-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-0-9-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-0-10-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-0-11-card" },
      ],
      eggDeck: [{ card: "ST1-01", as: "sukamon-dna-egg-0-card" }],
      security: [
        { card: "BT1-010", as: "sukamon-dna-filler-0-4-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-0-3-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-0-2-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-0-1-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-0-0-card" },
      ],
      battleArea: [
        {
          card: "EX13-021",
          as: "own-sukamon-dna-changed",
          top: { card: "EX13-021", as: "own-card-sukamon-dna-changed-card" },
          dp: 7000,
          placedByEffect: false,
          under: [{ card: "EX13-008", as: "own-source-sukamon-dna-changed-0-card" }],
        },
        {
          card: "EX13-044",
          as: "own-sukamon-dna-green",
          top: { card: "EX13-044", as: "own-card-sukamon-dna-green-card" },
          dp: 12000,
          placedByEffect: false,
        },
      ],
    },
    "1": {
      hand: [{ card: "BT11-043", as: "sukamon-dna-color-source-card", faceUp: false }],
      deck: [
        { card: "BT1-010", as: "sukamon-dna-filler-1-5-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-1-6-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-1-7-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-1-8-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-1-9-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-1-10-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-1-11-card" },
      ],
      eggDeck: [{ card: "ST1-01", as: "sukamon-dna-egg-1-card" }],
      trash: [
        { card: "BT11-040", as: "sukamon-dna-trash-0-card", faceUp: false },
        { card: "BT11-040", as: "sukamon-dna-trash-1-card", faceUp: false },
        { card: "BT11-040", as: "sukamon-dna-trash-2-card", faceUp: false },
      ],
      security: [
        { card: "BT1-010", as: "sukamon-dna-filler-1-4-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-1-3-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-1-2-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-1-1-card" },
        { card: "BT1-010", as: "sukamon-dna-filler-1-0-card" },
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
      main: [{ kind: "play", card: "BT11-043" }],
      decisions: [{ sourceCard: "BT11-043", kind: "chooseTargets", target: "own-sukamon-dna-changed" }],
    },
  },
};

export default fixture;
