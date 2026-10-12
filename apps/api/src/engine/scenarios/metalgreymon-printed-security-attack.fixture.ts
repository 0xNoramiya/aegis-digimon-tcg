import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "metalgreymon-printed-security-attack",
  memory: 5,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: { battleArea: [{ card: "EX12-016", as: "metalgreymon" }], deck: Array(12).fill("BT1-009"), security: 5 },
    1: { deck: Array(12).fill("BT1-009"), security: 5 },
  },
};

export default fixture;
