import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "borrowed-on-deletion-alliance-attack",
  board: {
    0: {
      battleArea: [
        { card: "BT27-072", as: "attacker", under: ["BT11-068", "BT6-064"] },
        { card: "BT27-072", as: "ally", under: ["BT8-065"] },
        { card: "BT4-096", as: "tamer" },
      ],
      deck: Array(8).fill("BT11-068"),
      security: 5,
    },
    1: {
      battleArea: [{ card: "ST1-03", as: "opponentDigimon" }],
      deck: Array(8).fill("ST1-03"),
      security: 5,
    },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
