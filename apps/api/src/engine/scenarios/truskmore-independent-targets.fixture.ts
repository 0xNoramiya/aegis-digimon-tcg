import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "truskmore-independent-targets",
  memory: 8,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT1-082", as: "own" }],
      hand: [{ card: "EX12-052", as: "option" }],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
    1: {
      battleArea: [
        { card: "BT1-009", as: "suspendFirst" },
        { card: "BT1-010", as: "suspendSecond" },
        { card: "BT1-011", as: "lockDigimon", suspended: true },
        { card: "BT1-085", as: "lockTamer", suspended: true },
      ],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
  },
};

export default fixture;
