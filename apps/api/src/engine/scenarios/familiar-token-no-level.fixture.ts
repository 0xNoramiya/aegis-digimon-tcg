import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "familiar-token-no-level",
  memory: 10,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: { hand: [{ card: "BT22-023", as: "aeroveedramon" }], deck: Array(12).fill("BT1-009"), security: 5 },
    1: {
      battleArea: [{ card: "TOKEN-Familiar-Token", as: "familiar" }],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
  },
};

export default fixture;
