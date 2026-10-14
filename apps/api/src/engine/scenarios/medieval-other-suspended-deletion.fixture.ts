import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "medieval-other-suspended-deletion",
  memory: 7,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT1-009", as: "ally" }],
      hand: [{ card: "EX8-074", as: "medieval" }],
      security: 5,
      deck: Array(12).fill("BT1-009"),
    },
    1: {
      battleArea: [{ card: "BT26-079", as: "target" }],
      security: [{ card: "BT26-100", as: "securityAura", faceUp: true }, "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      deck: Array(12).fill("BT1-009"),
    },
  },
};

export default fixture;
