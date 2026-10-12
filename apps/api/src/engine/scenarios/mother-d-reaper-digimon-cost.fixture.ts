import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "mother-d-reaper-digimon-cost",
  memory: 8,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "EX2-007", as: "mother", under: ["EX2-046", "EX2-046"] }],
      hand: [
        { card: "P-158", as: "tamer" },
        { card: "EX2-047", as: "digimon" },
      ],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
    1: { deck: Array(12).fill("BT1-009"), security: 5 },
  },
};

export default fixture;
