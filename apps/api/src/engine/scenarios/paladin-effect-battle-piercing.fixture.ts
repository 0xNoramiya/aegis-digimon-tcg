import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "paladin-effect-battle-piercing",
  memory: 8,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      hand: [{ card: "EX13-076", as: "paladin" }],
      trash: ["BT1-084", "BT2-032", "BT2-020", "BT6-044", "BT5-045", "BT6-111"],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
    1: {
      battleArea: [{ card: "BT1-009", as: "target", suspended: true, under: ["BT1-001"] }],
      deck: Array(12).fill("BT1-009"),
      security: 5,
    },
  },
};

export default fixture;
