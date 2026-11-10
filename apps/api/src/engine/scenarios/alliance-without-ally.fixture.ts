import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "alliance-without-ally",
  board: {
    0: {
      battleArea: [
        { card: "BT27-072", as: "attacker", under: ["BT6-064"] },
        { card: "BT1-009", as: "ally", suspended: true },
      ],
      deck: Array(8).fill("BT1-009"),
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT1-019", as: "opponentDigimon" }],
      deck: Array(8).fill("BT1-009"),
      security: 3,
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
