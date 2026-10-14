import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "rie-memory-overflow-reduced-digivolve",
  memory: 1,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        { card: "BT22-090", as: "rie" },
        { card: "BT22-083", as: "payment" },
      ],
      hand: [
        { card: "EX13-064", as: "lordKnightmon" },
        { card: "BT1-009", as: "overflowPlay" },
      ],
      deck: Array<string>(8).fill("BT1-010"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
    1: {
      deck: Array<string>(8).fill("BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
    },
  },
};

export default fixture;
