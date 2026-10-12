import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "lordknightmon-alliance-restoration",
  memory: 8,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  presentation: {
    opponent: { decisions: [{ sourceCard: "ST17-13", kind: "chooseTargets", target: "lord" }] },
  },
  board: {
    0: {
      battleArea: [
        { card: "EX13-064", as: "lord", under: ["EX13-058"] },
        { card: "BT1-009", as: "firstAttacker" },
      ],
      hand: [
        { card: "EX13-064", as: "restoredLord" },
        { card: "EX13-052", as: "gladimon" },
      ],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
    1: { security: ["ST17-13", "BT1-009", "BT1-009", "BT1-009", "BT1-009"], deck: Array(12).fill("BT1-009") },
  },
};

export default fixture;
