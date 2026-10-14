import type { ScenarioFixture } from "../scenario/types.js";

export default {
  name: "monica-reacts-to-placed-ts-option",
  board: {
    0: {
      hand: [
        { card: "BT25-091", as: "monica" },
        { card: "BT24-100", as: "inBetweenTheater" },
      ],
      deck: [
        { card: "BT1-010", as: "turnDraw" },
        { card: "BT1-010", as: "monicaDraw" },
        { card: "BT24-009", as: "revealedTsDigimon" },
        ...Array<string>(10).fill("BT1-010"),
      ],
      eggDeck: ["BT1-001"],
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT1-010", as: "opponentDigimon" }],
      deck: Array<string>(8).fill("BT1-010"),
      eggDeck: ["BT1-001"],
      security: 3,
    },
  },
  memory: 7,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
} satisfies ScenarioFixture;
