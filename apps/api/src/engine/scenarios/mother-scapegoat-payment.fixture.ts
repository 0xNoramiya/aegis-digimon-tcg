import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "mother-scapegoat-payment",
  memory: 10,
  turnSeat: 1,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  presentation: {
    holdBotAfterTurn: 5,
    opponent: {
      endBreeding: true,
      main: [{ kind: "play", card: "ST1-16" }],
      decisions: [{ sourceCard: "ST1-16", kind: "chooseTargets", target: "holder" }],
    },
  },
  board: {
    0: {
      battleArea: [
        { card: "LM-043", as: "holder", suspended: true },
        { card: "EX2-007", as: "mother" },
      ],
      security: 5,
      deck: Array(12).fill("BT1-009"),
    },
    1: {
      battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }],
      hand: [{ card: "ST1-16", as: "gaia" }],
      security: 5,
      deck: Array(12).fill("BT1-009"),
    },
  },
};

export default fixture;
