import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "mystimon-security-trash-attack-stays-optional",
  memory: 10,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT1-009", as: "readyAttacker" }],
      hand: [{ card: "EX13-033", as: "mistymonCard" }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: [{ card: "BT1-010", as: "topSecurity" }, "BT1-010", "BT1-010"],
    },
    1: {
      battleArea: [{ card: "BT1-010", as: "opponentRookie" }],
      deck: Array.from({ length: 16 }, () => "BT1-010"),
      security: ["BT1-010", "BT1-010", "BT1-010"],
    },
  },
};

export default fixture;
